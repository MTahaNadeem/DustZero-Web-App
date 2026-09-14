import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  isOffline: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, icon, isOffline }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{title}</span>
        {icon}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isOffline ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {isOffline ? '—' : value}
        </span>
        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{unit}</span>
      </div>
    </div>
  );
};
