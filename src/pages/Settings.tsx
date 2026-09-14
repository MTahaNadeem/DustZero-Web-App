import React, { useState } from 'react';
import { useDustZero, OFFLINE_TIMEOUT_MS } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Sun,
  Moon,
  Monitor,
  Wifi,
  Tag,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

// ─── Device Connection Section ────────────────────────────────────────────────

const DeviceConnectionSection: React.FC = () => {
  const { deviceId, setDeviceId } = useDustZero();
  const [tempId, setTempId] = useState(deviceId);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error' | 'network-error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

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
      const { data, error } = await supabase
        .from('devices')
        .select('device_id, connected, updated_at')
        .eq('device_id', tempId.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setStatus('error');
          setStatusMessage(`No device found with ID '${tempId.trim()}'. Check the ID and try again.`);
        } else {
          setStatus('network-error');
          setStatusMessage("Couldn't reach the server. Check your connection and try again.");
        }
      } else if (data) {
        setDeviceId(tempId.trim());

        const lastUpdate = new Date(data.updated_at).getTime();
        const now = Date.now();
        const isCurrentlyOnline = data.connected && (now - lastUpdate) < OFFLINE_TIMEOUT_MS;

        if (isCurrentlyOnline) {
          setStatus('success');
          setStatusMessage(`Device found — ${tempId.trim()} is currently online.`);
        } else {
          setStatus('warning');
          setStatusMessage(`Device saved — ${tempId.trim()} is currently offline.`);
        }

        setTimeout(() => {
          setStatus('idle');
          setStatusMessage('');
        }, 5000);
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
      {/* Section header */}
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

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label
            htmlFor="device-id-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}
          >
            Device ID
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
            The device ID configured in your ESP32 firmware
          </div>

          {/* Error message */}
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

        {/* Action row */}
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
              'Save & Reconnect'
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

      {/* Current device indicator */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Tag size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Currently monitoring:{' '}
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {deviceId}
          </strong>
        </span>
      </div>
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

// ─── About Section ────────────────────────────────────────────────────────────

const AboutSection: React.FC = () => (
  <div className="card">
    <div className="flex items-center gap-4" style={{ marginBottom: '20px' }}>
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
        ['Realtime', 'Supabase Postgres Changes'],
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

// ─── Settings Page ────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your DustZero dashboard and device connection."
      />

      <DeviceConnectionSection />
      <AppearanceSection />
      <AboutSection />
    </div>
  );
};

export default Settings;
