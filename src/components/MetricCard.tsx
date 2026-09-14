import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  isOffline: boolean;
  accentColor?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'teal' | 'default';
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  isOffline,
  accentColor = 'default',
  subtitle,
}) => {
  const getBadgeStyle = (): React.CSSProperties => {
    if (isOffline) {
      return { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' };
    }
    switch (accentColor) {
      case 'green':  return { backgroundColor: 'var(--accent-green-bg)',  color: 'var(--accent-green)' };
      case 'blue':   return { backgroundColor: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)' };
      case 'amber':  return { backgroundColor: 'var(--accent-amber-bg)',  color: 'var(--accent-amber)' };
      case 'red':    return { backgroundColor: 'var(--accent-red-bg)',    color: 'var(--accent-red)' };
      case 'purple': return { backgroundColor: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' };
      case 'teal':   return { backgroundColor: 'var(--accent-teal-bg)',   color: 'var(--accent-teal)' };
      default:       return { backgroundColor: 'var(--bg-elevated)',      color: 'var(--text-secondary)' };
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
      {/* Header row: label + icon badge */}
      <div className="flex justify-between items-center">
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            flexShrink: 0,
            ...getBadgeStyle(),
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value area */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        {isOffline ? (
          <span style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1 }}>
            —
          </span>
        ) : (
          <>
            <span style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {value}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              {unit}
            </span>
          </>
        )}
      </div>

      {/* Optional subtitle / context */}
      {subtitle && (
        <p style={{ fontSize: '0.8rem', color: isOffline ? 'var(--text-muted)' : 'var(--text-secondary)', margin: 0 }}>
          {isOffline ? 'Offline' : subtitle}
        </p>
      )}
    </div>
  );
};
