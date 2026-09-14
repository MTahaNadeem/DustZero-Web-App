import React from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { Power, Octagon } from 'lucide-react';

const CleaningControl = () => {
  const { device, isOnline, sendCommand, isLoadingCommand } = useDustZero();

  const handleEnable = () => sendCommand('START_CLEANING');
  const handleStop = () => sendCommand('STOP_CLEANING');

  const getPhaseName = (state: string | undefined) => {
    switch (state) {
      case 'IDLE': return 'Ready';
      case 'MOVING_DOWN': return 'Moving Down';
      case 'PAUSE_BOTTOM': return 'Paused at Bottom';
      case 'MOVING_UP': return 'Moving Up';
      case 'PAUSE_TOP': return 'Paused at Top';
      default: return 'Unknown';
    }
  };

  const progress = isOnline ? (device?.cleaning_progress || 0) : 0;
  const isStopped = device?.cleaning_state === 'IDLE' && !device.fault;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>Cleaning Control</h2>

      {device?.fault && (
        <div style={{ backgroundColor: 'var(--accent-red-dim)', padding: '16px', borderRadius: 'var(--border-radius)', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--accent-red)', margin: 0, fontSize: '1rem' }}>System Stopped</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            A fault has occurred. Hardware reboot required.
          </p>
        </div>
      )}
      
      {!device?.fault && isStopped && (
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--border-radius)', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>System Ready</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            System will automatically clean when conditions are optimal. Or press Enable Auto Cleaning to re-arm.
          </p>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `conic-gradient(var(--accent-green) ${progress}%, var(--bg-elevated) ${progress}%)` }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Phase
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: !isOnline ? 'var(--text-secondary)' : 'var(--text-primary)', textAlign: 'center', padding: '0 10px', marginTop: '4px' }}>
              {!isOnline ? '—' : getPhaseName(device?.cleaning_state)}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '8px' }}>
              {!isOnline ? '—' : `${progress}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Manual Override</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleEnable} 
            disabled={!isOnline || isLoadingCommand}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            <Power size={20} />
            {isLoadingCommand ? 'Sending...' : 'Enable Auto Cleaning'}
          </button>
          
          <button 
            className="btn btn-danger" 
            onClick={handleStop}
            disabled={!isOnline || isLoadingCommand}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            <Octagon size={20} />
            {isLoadingCommand ? 'Sending...' : 'Emergency Stop'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default CleaningControl;
