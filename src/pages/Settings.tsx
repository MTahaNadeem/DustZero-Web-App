import React, { useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';

const Settings = () => {
  const { deviceId, setDeviceId } = useDustZero();
  const [tempId, setTempId] = useState(deviceId);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('dustzero-theme') || 'system');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceId(tempId);
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
              onChange={(e) => setTempId(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)', 
                backgroundColor: 'var(--bg-main)', 
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            Save & Reconnect
          </button>
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
