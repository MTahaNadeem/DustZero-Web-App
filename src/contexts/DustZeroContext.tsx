import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Device, Alert } from '../types';
import type { User } from '@supabase/supabase-js';

interface DustZeroContextType {
  user: User | null;
  isInitializing: boolean;
  device: Device | null;
  devices: Device[];
  isOnline: boolean;
  alerts: Alert[];
  sendCommand: (command: 'START_CLEANING' | 'STOP_CLEANING') => Promise<void>;
  isLoadingCommand: boolean;
  dismissAlert: (id: string) => void;
  deviceId: string;
  setDeviceId: (id: string) => void;
}

const DustZeroContext = createContext<DustZeroContextType | undefined>(undefined);

export const OFFLINE_TIMEOUT_MS = 15000; // 15 seconds (firmware updates ~every 10s)

export const DustZeroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceIdState] = useState(localStorage.getItem('dustzero-device-id') || '');
  
  const setDeviceId = useCallback((id: string) => {
    localStorage.setItem('dustzero-device-id', id);
    setDeviceIdState(id);
  }, []);

  const [device, setDevice] = useState<Device | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingCommand, setIsLoadingCommand] = useState(false);
  
  const previousDeviceRef = useRef<Device | null>(null);

  // --- AUTH ---
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsInitializing(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setDevices([]);
        setDevice(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DATA FETCHING ---
  const clampDeviceValues = (rawDevice: Device): Device => {
    return {
      ...rawDevice,
      solar_power: Math.max(0, rawDevice.solar_power),
      solar_voltage: Math.max(0, rawDevice.solar_voltage),
      solar_current: Math.max(0, rawDevice.solar_current),
    };
  };

  const addAlert = useCallback((message: string, severity: 'info' | 'warning' | 'critical') => {
    setAlerts(prev => [
      { id: Date.now().toString() + Math.random().toString(), timestamp: new Date().toISOString(), severity, message, read: false },
      ...prev
    ]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const checkAlerts = useCallback((prev: Device | null, current: Device) => {
    if (!prev) return;

    if (!prev.rain_detected && current.rain_detected) {
      addAlert("Rain detected. Automatic cleaning suspended.", "info");
    }
    
    // Check cleaning events to log them (client-side detection for task 3)
    if (prev.cleaning_state === 'IDLE' && current.cleaning_state !== 'IDLE') {
      addAlert("Cleaning cycle started.", "info");
      // Could potentially log start time here or rely entirely on end time to fetch previous data
    }
    if (prev.cleaning_state !== 'IDLE' && current.cleaning_state === 'IDLE') {
      addAlert("Cleaning cycle completed or stopped.", "info");
      // Fire and forget insert into cleaning events
      supabase.from('cleaning_events').insert([{
        device_id: current.device_id,
        started_at: prev.updated_at, // approximation
        ended_at: current.updated_at,
        power_before: prev.solar_power,
        power_after: current.solar_power,
        power_delta: current.solar_power - prev.solar_power,
        sunlight_level: current.sunlight_level,
        trigger: 'AUTOMATIC' // Hard to distinguish from client unless we track recent commands
      }]).then(({ error }) => {
        if (error) console.error("Failed to log cleaning event", error);
      });
    }
  }, [addAlert]);

  // Fetch devices when user changes
  useEffect(() => {
    if (!user) return;
    
    const fetchDevices = async () => {
      const { data, error } = await supabase.from('devices').select('*');
      if (error) {
        console.error("Error fetching devices:", error);
        return;
      }
      if (data && data.length > 0) {
        const clamped = data.map(d => clampDeviceValues(d as Device));
        setDevices(clamped);
        
        // Auto-select if deviceId is empty or not in the list
        if (!deviceId || !data.find(d => d.device_id === deviceId)) {
          setDeviceId(data[0].device_id);
        }
      } else {
        setDevices([]);
        setDevice(null);
      }
    };
    
    fetchDevices();
  }, [user, deviceId, setDeviceId]);

  useEffect(() => {
    if (!user || !deviceId) {
      setDevice(null);
      return;
    }

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error) {
        console.error("Error fetching initial device state:", error);
        return;
      }

      if (data) {
        setDevice(clampDeviceValues(data as Device));
        previousDeviceRef.current = data as Device;
      }
    };

    fetchInitialData();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel(`device_updates_${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `device_id=eq.${deviceId}`
        },
        (payload) => {
          const updatedDevice = payload.new as Device;
          const clamped = clampDeviceValues(updatedDevice);
          
          if (previousDeviceRef.current) {
            checkAlerts(previousDeviceRef.current, clamped);
          }
          
          previousDeviceRef.current = clamped;
          setDevice(clamped);
          
          // Also update devices list
          setDevices(prev => prev.map(d => d.device_id === clamped.device_id ? clamped : d));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, deviceId, checkAlerts]);

  // Online status effect
  useEffect(() => {
    if (!device) {
      setIsOnline(false);
      return;
    }

    const checkOnline = () => {
      if (!device.connected) {
        setIsOnline(false);
        return;
      }
      
      const lastUpdate = new Date(device.updated_at).getTime();
      const now = new Date().getTime();
      
      // If updated_at is within the timeout, it's online
      const isCurrentlyOnline = (now - lastUpdate) < OFFLINE_TIMEOUT_MS;
      
      setIsOnline((prev) => {
        if (prev && !isCurrentlyOnline) {
          addAlert("Device went offline.", "warning");
        }
        if (!prev && isCurrentlyOnline) {
          addAlert("Device reconnected.", "info");
        }
        return isCurrentlyOnline;
      });
    };

    checkOnline();
    const interval = setInterval(checkOnline, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [device, addAlert]);

  const sendCommand = async (command: 'START_CLEANING' | 'STOP_CLEANING') => {
    if (!deviceId) return;
    
    setIsLoadingCommand(true);
    
    try {
      const { error } = await supabase
        .from('commands')
        .insert([
          {
            device_id: deviceId,
            command: command,
            status: 'PENDING'
          }
        ]);

      if (error) throw error;
      
      addAlert(`Command sent: ${command === 'START_CLEANING' ? 'Enable Auto Cleaning' : 'Emergency Stop'}`, 'info');
      
      // Simulate waiting for acknowledgement (max 13s)
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (err) {
      console.error("Failed to send command:", err);
      addAlert("Failed to send command.", "critical");
    } finally {
      setIsLoadingCommand(false);
    }
  };

  return (
    <DustZeroContext.Provider value={{
      user,
      isInitializing,
      device,
      devices,
      isOnline,
      alerts,
      sendCommand,
      isLoadingCommand,
      dismissAlert,
      deviceId,
      setDeviceId
    }}>
      {children}
    </DustZeroContext.Provider>
  );
};

export const useDustZero = () => {
  const context = useContext(DustZeroContext);
  if (context === undefined) {
    throw new Error('useDustZero must be used within a DustZeroProvider');
  }
  return context;
};
