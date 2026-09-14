import React, { useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';

const Settings = () => {
  const { deviceId, setDeviceId } = useDustZero();
  const [tempId, setTempId] = useState(deviceId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceId(tempId);
  };

  const toggleTheme = (theme: 'dark' | 'light' | 'system') => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dustzero-theme', theme);
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>Settings</h2>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Device Connection</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Device ID
            </label>
            <input 
              type="text" 
              value={tempId}
              onChange={(e) => setTempId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--bg-elevated)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            Save & Reconnect
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Appearance</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }} onClick={() => toggleTheme('dark')}>Dark</button>
          <button className="btn" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }} onClick={() => toggleTheme('light')}>Light</button>
          <button className="btn" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }} onClick={() => {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            toggleTheme(systemTheme);
          }}>System</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>About DustZero</h3>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
          DustZero Web App v1.0.0
        </p>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
          Web dashboard for the Smart Automatic Solar Panel Cleaning System.
        </p>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.9rem' }}>
          View GitHub Repository
        </a>
      </div>
    </div>
  );
};

export default Settings;
