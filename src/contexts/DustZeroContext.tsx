import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Device, Alert } from '../types';

interface DustZeroContextType {
  device: Device | null;
  isOnline: boolean;
  alerts: Alert[];
  sendCommand: (command: 'START_CLEANING' | 'STOP_CLEANING') => Promise<void>;
  isLoadingCommand: boolean;
  dismissAlert: (id: string) => void;
  deviceId: string;
  setDeviceId: (id: string) => void;
}

const DustZeroContext = createContext<DustZeroContextType | undefined>(undefined);

// In a real app, this might be selected by the user. Hardcoding for the single-device dashboard.
const DEFAULT_DEVICE_ID = 'dustzero-001';
const OFFLINE_TIMEOUT_MS = 15000; // 15 seconds (firmware updates ~every 10s)

export const DustZeroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceIdState] = useState(localStorage.getItem('dustzero-device-id') || DEFAULT_DEVICE_ID);
  
  const setDeviceId = useCallback((id: string) => {
    localStorage.setItem('dustzero-device-id', id);
    setDeviceIdState(id);
  }, []);

  const [device, setDevice] = useState<Device | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingCommand, setIsLoadingCommand] = useState(false);
  
  const previousDeviceRef = useRef<Device | null>(null);

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

    if (!prev.fault && current.fault) {
      addAlert("System Fault Detected! Hardware reboot required.", "critical");
    }
    if (!prev.rain_detected && current.rain_detected) {
      addAlert("Rain detected. Automatic cleaning suspended.", "info");
    }
    if (prev.cleaning_state === 'IDLE' && current.cleaning_state !== 'IDLE') {
      addAlert("Cleaning cycle started.", "info");
    }
    if (prev.cleaning_state !== 'IDLE' && current.cleaning_state === 'IDLE') {
      addAlert("Cleaning cycle completed or stopped.", "info");
    }
  }, [addAlert]);

  useEffect(() => {
    if (!deviceId) return;

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
      .channel('device_updates')
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [deviceId, checkAlerts]);

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
      device,
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
