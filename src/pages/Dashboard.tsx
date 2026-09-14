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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0 }}>Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isOnline && lastUpdated && (
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              Updated {lastUpdated.replace('about ', '')}
            </span>
          )}
          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <StatusBanner />

      <div className="grid grid-cols-2" style={{ gap: '20px', marginBottom: '32px' }}>
        <MetricCard
          title="Power"
          value={device?.solar_power.toFixed(2) || '0.00'}
          unit="W"
          icon={<Zap size={20} />}
          isOffline={!isOnline}
          accentColor="amber"
        />
        <MetricCard
          title="Voltage"
          value={device?.solar_voltage.toFixed(2) || '0.00'}
          unit="V"
          icon={<Activity size={20} />}
          isOffline={!isOnline}
          accentColor="blue"
        />
        <MetricCard
          title="Current"
          value={device?.solar_current.toFixed(2) || '0.00'}
          unit="A"
          icon={<Activity size={20} />}
          isOffline={!isOnline}
          accentColor="purple"
        />
        <MetricCard
          title="Temperature"
          value={device?.temperature.toFixed(1) || '0.0'}
          unit="°C"
          icon={<Thermometer size={20} />}
          isOffline={!isOnline}
          accentColor="red"
        />
      </div>

      <h3 style={{ marginBottom: '20px' }}>Environment</h3>
      <div className="grid grid-cols-2" style={{ gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Sunlight</span>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--accent-amber-bg)' : 'var(--bg-elevated)'
            }}>
              <Sun size={20} color={isOnline ? 'var(--accent-amber)' : 'var(--text-muted)'} />
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            {!isOnline ? (
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: 'var(--text-muted)',
                lineHeight: 1,
                marginBottom: '8px'
              }}>—</div>
            ) : (
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: device?.sunlight_level === 'STRONG' ? 'var(--accent-amber)' : 'var(--text-primary)',
                lineHeight: 1,
                marginBottom: '8px'
              }}>
                {device?.sunlight_level || 'UNKNOWN'}
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {!isOnline ? 'LDR: — / —' : `LDR1: ${device?.ldr1} • LDR2: ${device?.ldr2}`}
            </div>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Weather</span>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--accent-blue-bg)' : 'var(--bg-elevated)'
            }}>
              <CloudRain size={20} color={isOnline ? 'var(--accent-blue)' : 'var(--text-muted)'} />
            </div>
          </div>
          <div style={{ marginTop: 'auto' }}>
            {!isOnline ? (
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: 'var(--text-muted)',
                lineHeight: 1,
                marginBottom: '8px'
              }}>—</div>
            ) : (
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: device?.rain_detected ? 'var(--accent-blue)' : 'var(--accent-green)',
                lineHeight: 1,
                marginBottom: '8px'
              }}>
                {device?.rain_detected ? 'Rain Detected' : 'Clear'}
              </div>
            )}
             <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {!isOnline ? 'Status: —' : (device?.rain_detected ? 'Not safe for cleaning' : 'Safe for cleaning')}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '20px' }}>Quick Actions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Enable Auto Cleaning</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Clears emergency stop and resumes automatic mode.</div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleEnable} 
              disabled={!isOnline || isLoadingCommand || (device?.cleaning_state !== 'IDLE' && device?.cleaning_state !== undefined)}
            >
              <Power size={18} />
              {isLoadingCommand ? 'Sending...' : 'Enable System'}
            </button>
          </div>
          <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>
            <span style={{ color: !isOnline ? 'var(--text-muted)' : (conditionsMet ? 'var(--accent-green)' : 'var(--text-secondary)') }}>
              {isOnline ? (conditionsMet ? 'Conditions met (Will clean soon)' : 'Waiting for strong sun, no rain, low power') : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="card" style={{ 
          borderColor: 'var(--accent-red)', 
          borderWidth: '1px', 
          borderStyle: 'solid',
          backgroundColor: 'var(--accent-red-bg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--accent-red)', marginBottom: '4px' }}>Emergency Stop</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem' }}>Halts motor immediately.</div>
            </div>
            <button 
              className="btn btn-danger" 
              onClick={handleStop}
              disabled={!isOnline || isLoadingCommand}
            >
              <Octagon size={18} />
              {isLoadingCommand ? 'Sending...' : 'Emergency Stop'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '80px' }}>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          {!isOnline && 'Data may be out of date. Reconnecting...'}
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
