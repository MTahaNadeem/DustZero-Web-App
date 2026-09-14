
import { useDustZero } from '../contexts/DustZeroContext';
import { AlertCircle, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Alerts = () => {
  const { alerts, dismissAlert } = useDustZero();

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info color="var(--accent-blue)" size={20} />;
      case 'warning': return <AlertTriangle color="var(--accent-amber)" size={20} />;
      case 'critical': return <AlertCircle color="var(--accent-red)" size={20} />;
      default: return <Info color="var(--text-secondary)" size={20} />;
    }
  };

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'var(--accent-blue)';
      case 'warning': return 'var(--accent-amber)';
      case 'critical': return 'var(--accent-red)';
      default: return 'var(--bg-elevated)';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Alerts</h2>
        <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
          {alerts.filter(a => !a.read).length} unread
        </span>
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={48} style={{ margin: '0 auto', marginBottom: '16px', opacity: 0.5 }} />
          <p>No alerts recorded in this session.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="card"
              style={{ 
                borderLeft: `4px solid ${getBorderColor(alert.severity)}`,
                opacity: alert.read ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ marginTop: '2px' }}>{getIcon(alert.severity)}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: alert.read ? 400 : 600, color: 'var(--text-primary)' }}>
                    {alert.message}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {!alert.read && (
                <button 
                  onClick={() => dismissAlert(alert.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
