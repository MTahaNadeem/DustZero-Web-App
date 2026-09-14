import { useDustZero } from '../contexts/DustZeroContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const StatusBanner = () => {
  const { device, isOnline } = useDustZero();

  if (!isOnline || !device) {
    return (
      <div className="card" style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        borderLeft: '4px solid var(--text-secondary)',
        backgroundColor: 'var(--bg-elevated)'
      }}>
        <div style={{ backgroundColor: 'var(--border-subtle)', padding: '10px', borderRadius: '12px' }}>
          <XCircle color="var(--text-secondary)" size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>System Offline</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cannot reach DustZero device. Data may be stale.</p>
        </div>
      </div>
    );
  }

  if (device.fault) {
    return (
      <div className="card" style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        borderLeft: '4px solid var(--accent-red)',
        backgroundColor: 'var(--accent-red-bg)',
        borderColor: 'rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '12px' }}>
          <AlertCircle color="var(--accent-red)" size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--accent-red)', fontWeight: 600 }}>System Fault</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Hardware reboot required to clear fault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ 
      padding: '16px 20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '16px', 
      marginBottom: '24px',
      borderLeft: '4px solid var(--accent-green)',
      backgroundColor: 'var(--accent-green-bg)',
      borderColor: 'rgba(16, 185, 129, 0.2)'
    }}>
      <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '12px' }}>
        <CheckCircle color="var(--accent-green)" size={24} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--accent-green)', fontWeight: 600 }}>System Optimal</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>All sensors operational. {device.cleaning_state === 'IDLE' ? 'Ready to clean.' : 'Cleaning in progress.'}</p>
      </div>
    </div>
  );
};
