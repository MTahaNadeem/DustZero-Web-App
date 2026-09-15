import React, { useState, useEffect } from 'react';
import { useDustZero, OFFLINE_TIMEOUT_MS } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import type { DeviceSettings } from '../types';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Sun,
  Moon,
  Monitor,
  Wifi,
  LogOut,
  Bell
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

// ─── Device Connection Section ────────────────────────────────────────────────

const DeviceConnectionSection: React.FC = () => {
  const { deviceId, setDeviceId, devices, refreshDevices } = useDustZero();
  const [tempId, setTempId] = useState(deviceId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error' | 'network-error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Update tempId when deviceId changes (e.g., from initial load or switcher)
  useEffect(() => {
    setTempId(deviceId);
  }, [deviceId]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempId(e.target.value);
    if (status === 'error' || status === 'network-error') {
      setStatus('idle');
      setStatusMessage('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempId.trim() || isConnecting) return;

    setIsConnecting(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      // Check if user owns it already or if it exists
      const { data, error } = await supabase
        .from('devices')
        .select('device_id, connected, updated_at, user_id')
        .eq('device_id', tempId.trim())
        .single();

      if (error && error.code !== 'PGRST116') {
         setStatus('network-error');
         setStatusMessage("Couldn't reach the server. Check your connection and try again.");
      } else if (!data) {
        // Device might exist but owned by someone else, or doesn't exist
        // For simplicity, we just try to insert it (claim it)
        const { error: insertError } = await supabase.from('devices').insert([{
          device_id: tempId.trim(),
          user_id: (await supabase.auth.getSession()).data.session?.user.id,
          connected: false,
          ldr1: 0, ldr2: 0, temperature: 0, solar_voltage: 0, solar_current: 0, solar_power: 0,
          rain_detected: false, sunlight_level: 'WEAK',
          cleaning_state: 'IDLE',
        }]);

        if (insertError) {
           setStatus('error');
           setStatusMessage(`Cannot claim device '${tempId.trim()}'. It may be owned by another user.`);
        } else {
           await refreshDevices();
           setDeviceId(tempId.trim());
           setStatus('success');
           setStatusMessage(`Device ${tempId.trim()} added successfully.`);
        }
      } else {
        const currentUserId = (await supabase.auth.getSession()).data.session?.user.id;
        
        if (data.user_id === null) {
          // Device exists but is unclaimed. Claim it!
          const { error: updateError } = await supabase
            .from('devices')
            .update({ user_id: currentUserId })
            .eq('device_id', tempId.trim());

          if (updateError) {
            setStatus('error');
            setStatusMessage(`Cannot claim device '${tempId.trim()}'. It may be owned by another user.`);
            return;
          }
          
          await refreshDevices();
          setDeviceId(tempId.trim());
          setStatus('success');
          setStatusMessage(`Device ${tempId.trim()} claimed successfully.`);
        } else {
          // Device is already ours
          await refreshDevices();
          setDeviceId(tempId.trim());

          const lastUpdate = new Date(data.updated_at).getTime();
          const now = Date.now();
          const isCurrentlyOnline = data.connected && (now - lastUpdate) < OFFLINE_TIMEOUT_MS;

          if (isCurrentlyOnline) {
            setStatus('success');
            setStatusMessage(`Device selected — ${tempId.trim()} is currently online.`);
          } else {
            setStatus('warning');
            setStatusMessage(`Device selected — ${tempId.trim()} is currently offline.`);
          }

          setTimeout(() => {
            setStatus('idle');
            setStatusMessage('');
          }, 5000);
        }
      }
    } catch {
      setStatus('network-error');
      setStatusMessage("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
        <div
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--accent-blue-bg)',
            border: '1px solid var(--accent-blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Wifi size={18} color="var(--accent-blue)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Device Connection</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Configure which DustZero device to monitor
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Select Device
        </label>
        <select 
          className="input" 
          value={deviceId} 
          onChange={(e) => {
            setDeviceId(e.target.value);
            setTempId(e.target.value);
          }}
          style={{ marginBottom: '16px' }}
        >
          {devices.map(d => (
            <option key={d.device_id} value={d.device_id}>{d.device_id}</option>
          ))}
          {devices.length === 0 && <option value="">No devices found</option>}
        </select>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <div>
          <label
            htmlFor="device-id-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}
          >
            Add / Claim New Device
          </label>
          <input
            id="device-id-input"
            type="text"
            value={tempId}
            onChange={handleIdChange}
            disabled={isConnecting}
            placeholder="e.g. dustzero-001"
            className={`input${(status === 'error' || status === 'network-error') ? ' error' : ''}`}
            aria-describedby="device-id-hint"
          />
          <div id="device-id-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Enter the exact device ID configured in your ESP32 firmware to claim it.
          </div>

          {(status === 'error' || status === 'network-error') && (
            <div
              className="flex items-center gap-2"
              style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '8px' }}
              role="alert"
            >
              <AlertCircle size={15} />
              {statusMessage}
            </div>
          )}
        </div>

        <div className="flex items-center gap-12 flex-wrap">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isConnecting || !tempId.trim()}
            aria-busy={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Checking device…
              </>
            ) : (
              'Add / Switch Device'
            )}
          </button>

          {status === 'success' && (
            <div className="flex items-center gap-2" style={{ color: 'var(--accent-green)', fontSize: '0.9rem', fontWeight: 500 }}>
              <CheckCircle2 size={16} />
              {statusMessage}
            </div>
          )}
          {status === 'warning' && (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
              <Info size={16} />
              {statusMessage}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

// ─── Baseline Calibration Section ───────────────────────────────────────────────

const BaselineCalibrationSection: React.FC = () => {
  const { device, isOnline, deviceId } = useDustZero();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [message, setMessage] = useState('');

  const handleCalibrate = async () => {
    if (!device || !isOnline) return;
    setIsCalibrating(true);
    setMessage('');
    
    try {
      const { error } = await supabase.from('device_baselines').upsert({
        device_id: deviceId,
        sunlight_level: device.sunlight_level,
        baseline_power: device.solar_power,
        recorded_at: new Date().toISOString()
      }, { onConflict: 'device_id, sunlight_level' });
      
      if (error) throw error;
      setMessage(`Baseline calibrated for ${device.sunlight_level} light: ${device.solar_power.toFixed(3)}W`);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Sun size={18} color="var(--accent-green)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Clean Panel Baseline</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calibrate expected power for clean panel comparison
          </p>
        </div>
      </div>
      
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
        Ensure the panel is physically clean before calibrating. The current power output will be saved as the baseline for the current sunlight level (<strong>{device?.sunlight_level ?? '—'}</strong>).
      </p>
      
      <div className="flex items-center gap-4 flex-wrap">
        <button className="btn btn-primary" onClick={handleCalibrate} disabled={!isOnline || isCalibrating}>
          {isCalibrating ? 'Calibrating...' : 'Calibrate Now'}
        </button>
        {message && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{message}</span>}
      </div>
    </div>
  );
};

// ─── Device Settings Section ──────────────────────────────────────────────────

const DeviceSettingsSection: React.FC = () => {
  const { deviceId } = useDustZero();
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!deviceId) return;
      const { data } = await supabase.from('device_settings').select('*').eq('device_id', deviceId).single();
      if (data) setSettings(data as DeviceSettings);
      setLoading(false);
    };
    fetchSettings();
  }, [deviceId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !deviceId) return;
    setSaving(true);
    await supabase.from('device_settings').upsert({ ...settings, device_id: deviceId });
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Device Parameters</h3>
      </div>
      
      <div style={{ backgroundColor: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
        <strong>Note:</strong> The ESP32 firmware requires an update to read these settings. Changes made here currently have no physical effect.
      </div>
      
      {settings ? (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Power Threshold (W)</label>
            <input type="number" step="0.01" className="input" value={settings.power_threshold} onChange={e => setSettings({...settings, power_threshold: parseFloat(e.target.value)})} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cleaning Cooldown (min)</label>
            <input type="number" className="input" value={settings.cleaning_cooldown_minutes} onChange={e => setSettings({...settings, cleaning_cooldown_minutes: parseInt(e.target.value)})} />
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      ) : (
        <button className="btn" onClick={() => setSettings({ device_id: deviceId, automatic_cleaning: true, power_threshold: 0.05, sunlight_threshold: 200, cleaning_distance_steps: 500, cleaning_cooldown_minutes: 30, updated_at: new Date().toISOString() })}>Initialize Settings</button>
      )}
    </div>
  );
};

// ─── Notifications Section ────────────────────────────────────────────────────

const NotificationsSection: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      setPermission(p);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Bell size={18} color="var(--text-primary)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Browser push notifications for critical events
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: permission === 'granted' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          {permission}
        </span>
      </div>

      {permission !== 'granted' && (
        <button className="btn" style={{ marginTop: '16px' }} onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
};


// ─── Appearance Section ───────────────────────────────────────────────────────

const AppearanceSection: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState(
    localStorage.getItem('dustzero-theme') || 'system'
  );

  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    setCurrentTheme(theme);
    localStorage.setItem('dustzero-theme', theme);
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  const options = [
    { key: 'light' as const, label: 'Light', Icon: Sun },
    { key: 'dark' as const, label: 'Dark', Icon: Moon },
    { key: 'system' as const, label: 'System', Icon: Monitor },
  ];

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
        <div
          style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--accent-purple-bg)',
            border: '1px solid var(--accent-purple-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Sun size={18} color="var(--accent-purple)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Appearance</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Choose your preferred color scheme
          </p>
        </div>
      </div>

      <div className="theme-selector">
        {options.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`theme-option${currentTheme === key ? ' selected' : ''}`}
            onClick={() => applyTheme(key)}
            aria-pressed={currentTheme === key}
            aria-label={`${label} theme`}
          >
            <div className="theme-option-icon">
              <Icon size={18} />
            </div>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── About & User Section ────────────────────────────────────────────────────────────

const AboutSection: React.FC = () => {
  const { user } = useDustZero();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <div className="flex items-center gap-4">
          <img
            src="/DustZeroIcon.png"
            alt="DustZero"
            style={{ width: '48px', height: '48px', borderRadius: '12px' }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>DustZero</h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Smart Solar Panel Cleaning System
            </p>
          </div>
        </div>
        
        {user && (
          <button className="btn btn-danger" onClick={handleSignOut} style={{ padding: '8px 12px' }}>
            <LogOut size={16} /> Sign Out
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        {[
          ['Version', '1.0.0'],
          ['Architecture', 'ESP32-S3 → Supabase → Web App'],
          ['User Email', user?.email || '—'],
        ].map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{key}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: key === 'Version' ? 'monospace' : undefined }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
        An IoT system that monitors a solar panel using an ESP32-S3 and automatically cleans
        the panel when appropriate conditions are detected.
      </p>
    </div>
  );
};

// ─── Settings Page ────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your DustZero dashboard and device connection."
      />

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div>
          <DeviceConnectionSection />
          <BaselineCalibrationSection />
          <NotificationsSection />
        </div>
        <div>
          <DeviceSettingsSection />
          <AppearanceSection />
          <AboutSection />
        </div>
      </div>
    </div>
  );
};

export default Settings;
