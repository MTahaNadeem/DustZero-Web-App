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
  Bell,
  MapPin,
  Map,
  Settings2,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ConfirmationModal } from '../components/ConfirmationModal';

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

// ─── Device Location Section ──────────────────────────────────────────────────

const DeviceLocationSection: React.FC = () => {
  const { device, deviceId, refreshDevices } = useDustZero();
  const [lat, setLat] = useState(device?.latitude?.toString() ?? '');
  const [lon, setLon] = useState(device?.longitude?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLat(device?.latitude?.toString() ?? '');
    setLon(device?.longitude?.toString() ?? '');
  }, [device?.latitude, device?.longitude]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    setSaving(true);
    setMessage('');
    
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    
    if (lat.trim() !== '' || lon.trim() !== '') {
      if (isNaN(parsedLat) || isNaN(parsedLon)) {
        setMessage('Failed: Please enter valid numbers for latitude and longitude.');
        setSaving(false);
        return;
      }
      if (parsedLat < -90 || parsedLat > 90) {
        setMessage('Failed: Latitude must be between -90 and 90.');
        setSaving(false);
        return;
      }
      if (parsedLon < -180 || parsedLon > 180) {
        setMessage('Failed: Longitude must be between -180 and 180.');
        setSaving(false);
        return;
      }
    }
    
    const { error } = await supabase
      .from('devices')
      .update({
        latitude: lat.trim() === '' ? null : parsedLat,
        longitude: lon.trim() === '' ? null : parsedLon
      })
      .eq('device_id', deviceId);
      
    setSaving(false);
    
    if (error) {
      setMessage('Failed to save location.');
    } else {
      setMessage('Location saved successfully.');
      await refreshDevices();
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setMessage('Location obtained. Remember to click Save.');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setMessage('Failed: Location permission was denied. You can enter your location manually.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setMessage('Failed: Your location could not be determined. Please try again or enter it manually.');
        } else if (err.code === err.TIMEOUT) {
          setMessage('Failed: Location request timed out. Please try again.');
        } else {
          setMessage('Failed: An unknown error occurred while getting location.');
        }
      }
    );
  };

  if (!deviceId) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--accent-purple-bg)',
            border: '1px solid var(--accent-purple-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <MapPin size={18} color="var(--accent-purple)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Device Location</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Used for weather forecasting and rain warnings
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Latitude</label>
            <input type="number" step="any" placeholder="e.g. 40.7128" className="input" value={lat} onChange={e => setLat(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Longitude</label>
            <input type="number" step="any" placeholder="e.g. -74.0060" className="input" value={lon} onChange={e => setLon(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Location'}
          </button>
          <button type="button" className="btn btn-outline" onClick={handleGeolocation}>
            <Map size={16} /> Use My Location
          </button>
          {message && <span style={{ fontSize: '0.85rem', color: message.includes('Failed') ? 'var(--accent-red)' : 'var(--accent-green)' }}>{message}</span>}
        </div>
      </form>
    </div>
  );
};

// ─── Device Management Section ────────────────────────────────────────────────

const DeviceManagementSection: React.FC = () => {
  const { device, deviceId, refreshDevices, setDeviceId, devices } = useDustZero();
  const [name, setName] = useState(device?.device_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isUnclaimModalOpen, setIsUnclaimModalOpen] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);

  useEffect(() => {
    setName(device?.device_name || '');
  }, [device?.device_name]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    setSaving(true);
    setMessage('');
    
    const { error } = await supabase
      .from('devices')
      .update({ device_name: name.trim() || null })
      .eq('device_id', deviceId);
      
    setSaving(false);
    if (error) {
      setMessage('Failed to save name.');
    } else {
      setMessage('Name saved successfully.');
      await refreshDevices();
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUnclaim = async () => {
    if (!deviceId) return;
    setUnclaiming(true);
    
    const { error } = await supabase
      .from('devices')
      .update({ user_id: null })
      .eq('device_id', deviceId);
      
    setUnclaiming(false);
    setIsUnclaimModalOpen(false);
    
    if (!error) {
      // Find another device to switch to
      await refreshDevices();
      const remainingDevices = devices.filter(d => d.device_id !== deviceId);
      if (remainingDevices.length > 0) {
        setDeviceId(remainingDevices[0].device_id);
      } else {
        setDeviceId('');
      }
    } else {
      setMessage('Failed to unclaim device.');
    }
  };

  if (!deviceId) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Settings2 size={18} color="var(--text-primary)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Device Management</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Rename or release this device
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Friendly Name</label>
          <div className="flex items-center gap-3">
            <input type="text" placeholder="e.g. Roof Panel" className="input" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-outline" disabled={saving}>
              {saving ? 'Saving...' : 'Save Name'}
            </button>
          </div>
          {message && !message.includes('unclaim') && <span style={{ fontSize: '0.85rem', color: message.includes('Failed') ? 'var(--accent-red)' : 'var(--accent-green)', display: 'block', marginTop: '6px' }}>{message}</span>}
        </div>
      </form>

      <div style={{ padding: '16px', backgroundColor: 'var(--accent-red-bg)', borderRadius: '8px', border: '1px solid var(--accent-red-border)' }}>
        <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-red)', fontSize: '0.9rem' }}>Danger Zone</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Releasing this device will remove it from your account. It will become claimable by anyone else who knows the device ID.
        </p>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setIsUnclaimModalOpen(true)} disabled={unclaiming}>
          <Trash2 size={14} /> Release Device
        </button>
        {message && message.includes('unclaim') && <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', marginLeft: '12px' }}>{message}</span>}
      </div>

      <ConfirmationModal
        isOpen={isUnclaimModalOpen}
        title="Release Device?"
        description={`Are you sure you want to release ${device?.device_name || deviceId}? This will remove it from your account and make it claimable by others.`}
        confirmLabel="Release Device"
        isDestructive={true}
        onConfirm={handleUnclaim}
        onCancel={() => setIsUnclaimModalOpen(false)}
      />
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


// ─── Public Share Section ───────────────────────────────────────────────────────

const PublicShareSection: React.FC = () => {
  const { device, deviceId, refreshDevices } = useDustZero();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleShare = async () => {
    if (!deviceId || !device) return;
    setLoading(true);
    
    const isNowPublic = !device.is_public;
    // Generate a random slug if making public, else null
    const newSlug = isNowPublic ? Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) : null;
    
    await supabase.from('devices').update({
      is_public: isNowPublic,
      public_slug: newSlug
    }).eq('device_id', deviceId);
    
    await refreshDevices();
    setLoading(false);
  };

  const shareUrl = device?.is_public && device.public_slug 
    ? `${window.location.origin}/share/${device.public_slug}`
    : '';

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!deviceId) return null;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--accent-blue-bg)',
            border: '1px solid var(--accent-blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Share2 size={18} color="var(--accent-blue)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Public Read-Only Link</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Share live device data without granting control
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: device?.is_public ? '1px solid var(--border-subtle)' : 'none', marginBottom: device?.is_public ? '16px' : '0' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Enable public sharing</span>
        <button 
          onClick={toggleShare} 
          disabled={loading}
          style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none',
            backgroundColor: device?.is_public ? 'var(--accent-green)' : 'var(--bg-elevated)',
            cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s'
          }}
        >
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
            position: 'absolute', top: '2px', left: device?.is_public ? '22px' : '2px', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </button>
      </div>

      {device?.is_public && (
        <div className="animate-slide-up">
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border-medium)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="text" readOnly value={shareUrl} className="input" style={{ flex: 1, border: 'none', backgroundColor: 'transparent', padding: 0 }} />
            <button className="btn btn-outline btn-sm" onClick={copyToClipboard}>
              {copied ? 'Copied!' : <><Copy size={14} /> Copy</>}
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <ExternalLink size={14} />
            </a>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', borderRadius: '8px', color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
            <strong>Warning:</strong> Anyone with this link can view live and historical data for this device. They cannot control the device or access other devices on your account. Disabling sharing will immediately invalidate the current link.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Firmware Section ─────────────────────────────────────────────────────────

const FirmwareSection: React.FC = () => {
  const { device, deviceId } = useDustZero();
  const [latestRelease, setLatestRelease] = useState<any>(null);

  useEffect(() => {
    const fetchFirmware = async () => {
      const { data } = await supabase
        .from('firmware_releases')
        .select('*')
        .eq('is_latest', true)
        .maybeSingle();
      if (data) setLatestRelease(data);
    };
    fetchFirmware();
  }, []);

  if (!deviceId) return null;

  const currentVersion = device?.firmware_version || 'Unknown';
  const hasUpdate = latestRelease && currentVersion !== 'Unknown' && latestRelease.version !== currentVersion;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Cpu size={18} color="var(--text-primary)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Firmware Info</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            System software details
          </p>
        </div>
      </div>

      <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Current Version:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{currentVersion}</span>
        </div>
        {latestRelease && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Latest Available:</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{latestRelease.version}</span>
          </div>
        )}
      </div>

      {hasUpdate && latestRelease && (
        <div style={{ padding: '12px', backgroundColor: 'var(--accent-blue-bg)', borderRadius: '8px', border: '1px solid var(--accent-blue-border)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '4px' }}>
            Update Available!
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            A newer firmware ({latestRelease.version}) is available. Please reflash your ESP32 with the latest release to get new features and fixes.
          </p>
          {latestRelease.release_notes && (
             <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {latestRelease.release_notes}
             </div>
          )}
        </div>
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
          <DeviceManagementSection />
          <FirmwareSection />
          <DeviceLocationSection />
          <PublicShareSection />
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
