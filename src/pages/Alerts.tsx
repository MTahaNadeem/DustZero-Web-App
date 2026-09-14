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

  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case 'info': 
        return { borderLeft: '4px solid var(--accent-blue)', backgroundColor: 'var(--accent-blue-bg)' };
      case 'warning': 
        return { borderLeft: '4px solid var(--accent-amber)', backgroundColor: 'var(--accent-amber-bg)' };
      case 'critical': 
        return { borderLeft: '4px solid var(--accent-red)', backgroundColor: 'var(--accent-red-bg)' };
      default: 
        return { borderLeft: '4px solid var(--bg-elevated)', backgroundColor: 'var(--bg-elevated)' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0 }}>Alerts</h2>
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          {alerts.filter(a => !a.read).length} Unread
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={48} style={{ margin: '0 auto', marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '1.1rem' }}>No active alerts.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="card"
              style={{ 
                ...getAlertStyle(alert.severity),
                opacity: alert.read ? 0.6 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ marginTop: '2px', backgroundColor: 'var(--bg-card)', padding: '8px', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
                  {getIcon(alert.severity)}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '4px' }}>
                    {alert.message}
                  </p>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {!alert.read && (
                <button 
                  onClick={() => dismissAlert(alert.id)}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
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
