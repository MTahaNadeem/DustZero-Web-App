import React, { useState } from 'react';
import { useDustZero, OFFLINE_TIMEOUT_MS } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const Settings = () => {
  const { deviceId, setDeviceId } = useDustZero();
  const [tempId, setTempId] = useState(deviceId);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('dustzero-theme') || 'system');
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
        .eq('device_id', tempId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setStatus('error');
          setStatusMessage(`No device found with ID '${tempId}'. Check the ID and try again.`);
        } else {
          setStatus('network-error');
          setStatusMessage("Couldn't reach the server. Check your connection and try again.");
        }
      } else if (data) {
        setDeviceId(tempId);
        
        const lastUpdate = new Date(data.updated_at).getTime();
        const now = new Date().getTime();
        const isCurrentlyOnline = data.connected && ((now - lastUpdate) < OFFLINE_TIMEOUT_MS);
        
        if (isCurrentlyOnline) {
          setStatus('success');
          setStatusMessage(`Device ID saved — ${tempId} is online`);
        } else {
          setStatus('warning');
          setStatusMessage(`Device ID saved — ${tempId} is currently offline`);
        }
        
        setTimeout(() => {
          setStatus('idle');
          setStatusMessage('');
        }, 4000);
      }
    } catch (err) {
      setStatus('network-error');
      setStatusMessage("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleTheme = (theme: 'dark' | 'light' | 'system') => {
    setCurrentTheme(theme);
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('dustzero-theme', theme);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '32px', margin: 0 }}>Settings</h2>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Device Connection</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Device ID
            </label>
            <input 
              type="text" 
              value={tempId}
              onChange={handleIdChange}
              disabled={isConnecting}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: `1px solid ${(status === 'error' || status === 'network-error') ? 'var(--accent-red)' : 'var(--border-subtle)'}`, 
                backgroundColor: 'var(--bg-main)', 
                color: 'var(--text-primary)',
                fontSize: '1rem',
                opacity: isConnecting ? 0.7 : 1
              }}
            />
            {(status === 'error' || status === 'network-error') && (
              <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginTop: '8px' }}>
                <AlertCircle size={16} />
                {statusMessage}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                'Save & Reconnect'
              )}
            </button>
            {status === 'success' && (
              <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                <CheckCircle2 size={18} />
                {statusMessage}
              </div>
            )}
            {status === 'warning' && (
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                <Info size={18} />
                {statusMessage}
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Appearance</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => toggleTheme('dark')}
          >
            Dark Mode
          </button>
          <button 
            className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => toggleTheme('light')}
          >
            Light Mode
          </button>
          <button 
            className={`btn ${currentTheme === 'system' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => toggleTheme('system')}
          >
            System Default
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>About DustZero</h3>
        <p className="text-secondary" style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
          DustZero Web App v1.0.0
        </p>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
          Premium dashboard for the Smart Automatic Solar Panel Cleaning System.
        </p>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ 
          color: 'var(--accent-green)', 
          textDecoration: 'none', 
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'var(--accent-green-bg)',
          borderRadius: '8px',
          transition: 'all 0.2s'
        }}>
          View GitHub Repository
        </a>
      </div>
    </div>
  );
};

export default Settings;
