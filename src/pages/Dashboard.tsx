import { useEffect, useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { StatusBanner } from '../components/StatusBanner';
import { MetricCard } from '../components/MetricCard';
import { Zap, Activity, Thermometer, Sun, CloudRain, Power, Octagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const { device, isOnline, sendCommand, isLoadingCommand } = useDustZero();
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!device?.updated_at) return;
    
    const updateTime = () => {
      setLastUpdated(formatDistanceToNow(new Date(device.updated_at), { addSuffix: true }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [device?.updated_at]);

  const handleEnable = () => sendCommand('START_CLEANING');
  const handleStop = () => sendCommand('STOP_CLEANING');

  const conditionsMet = device && (device.sunlight_level === 'STRONG' && !device.rain_detected && device.solar_power < 0.05);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`}></span>
          <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <StatusBanner />

      <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
        <MetricCard
          title="Power"
          value={device?.solar_power.toFixed(2) || '0.00'}
          unit="W"
          icon={<Zap size={18} />}
          isOffline={!isOnline}
        />
        <MetricCard
          title="Voltage"
          value={device?.solar_voltage.toFixed(2) || '0.00'}
          unit="V"
          icon={<Activity size={18} />}
          isOffline={!isOnline}
        />
        <MetricCard
          title="Current"
          value={device?.solar_current.toFixed(2) || '0.00'}
          unit="A"
          icon={<Activity size={18} />}
          isOffline={!isOnline}
        />
        <MetricCard
          title="Temperature"
          value={device?.temperature.toFixed(1) || '0.0'}
          unit="°C"
          icon={<Thermometer size={18} />}
          isOffline={!isOnline}
        />
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Environment</h3>
      <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sunlight</span>
            <Sun size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: !isOnline ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
            {!isOnline ? '—' : (device?.sunlight_level || 'UNKNOWN')}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
            {!isOnline ? 'LDR1: — | LDR2: —' : `LDR1: ${device?.ldr1} | LDR2: ${device?.ldr2}`}
          </div>
        </div>
        
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Weather</span>
            <CloudRain size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: !isOnline ? 'var(--text-secondary)' : (device?.rain_detected ? 'var(--accent-red)' : 'var(--accent-green)') }}>
            {!isOnline ? '—' : (device?.rain_detected ? 'Rain Detected' : 'Clear')}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Enable Auto Cleaning</div>
              <div className="text-secondary" style={{ fontSize: '0.85rem' }}>Clears emergency stop and resumes automatic mode.</div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleEnable} 
              disabled={!isOnline || isLoadingCommand || (device?.cleaning_state !== 'IDLE' && device?.cleaning_state !== undefined)}
            >
              <Power size={18} />
              {isLoadingCommand ? 'Sending...' : 'Enable'}
            </button>
          </div>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Cleaning Condition:</strong>
            <span style={{ color: conditionsMet ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              {isOnline ? (conditionsMet ? 'Met (System will clean soon)' : 'Not Met (Waiting for strong sun, no rain, low power)') : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="card" style={{ borderColor: 'var(--accent-red)', borderWidth: '1px', borderStyle: 'solid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent-red)' }}>Emergency Stop</div>
              <div className="text-secondary" style={{ fontSize: '0.85rem' }}>Halts motor immediately.</div>
            </div>
            <button 
              className="btn btn-danger" 
              onClick={handleStop}
              disabled={!isOnline || isLoadingCommand}
            >
              <Octagon size={18} />
              {isLoadingCommand ? 'Sending...' : 'Stop'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '80px' }}>
        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
          {isOnline ? `Last updated ${lastUpdated}` : 'Data may be out of date'}
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
