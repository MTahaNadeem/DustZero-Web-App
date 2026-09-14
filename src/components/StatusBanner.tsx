
import { useDustZero } from '../contexts/DustZeroContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const StatusBanner = () => {
  const { device, isOnline } = useDustZero();

  if (!isOnline || !device) {
    return (
      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <XCircle color="var(--text-secondary)" size={24} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>System Offline</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cannot reach DustZero device. Data may be stale.</p>
        </div>
      </div>
    );
  }

  if (device.fault) {
    return (
      <div style={{ backgroundColor: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', padding: '16px', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <AlertCircle color="var(--accent-red)" size={24} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-red)' }}>System Fault</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Hardware reboot required to clear fault.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', padding: '16px', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <CheckCircle color="var(--accent-green)" size={24} />
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-green)' }}>System Optimal</h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>All sensors operational. {device.cleaning_state === 'IDLE' ? 'Ready to clean.' : 'Cleaning in progress.'}</p>
      </div>
    </div>
  );
};
