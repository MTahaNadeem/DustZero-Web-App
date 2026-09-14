import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  isOffline: boolean;
  accentColor?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'default';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  isOffline,
  accentColor = 'default'
}) => {
  const getBadgeStyle = () => {
    if (isOffline) {
      return { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' };
    }
    
    switch (accentColor) {
      case 'green': return { backgroundColor: 'var(--accent-green-bg)', color: 'var(--accent-green)' };
      case 'blue': return { backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' };
      case 'amber': return { backgroundColor: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' };
      case 'red': return { backgroundColor: 'var(--accent-red-bg)', color: 'var(--accent-red)' };
      case 'purple': return { backgroundColor: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' };
      default: return { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '36px', 
          height: '36px', 
          borderRadius: '10px',
          ...getBadgeStyle()
        }}>
          {icon}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: 'auto' }}>
        {isOffline ? (
          <div style={{ 
            height: '32px', 
            width: '60%', 
            backgroundColor: 'var(--border-subtle)', 
            borderRadius: '4px',
            opacity: 0.5
          }} />
        ) : (
          <>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {value}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
          </>
        )}
      </div>
    </div>
  );
};
