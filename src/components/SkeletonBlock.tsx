import React from 'react';

interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '6px',
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export const MetricCardSkeleton: React.FC = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
    <div className="flex justify-between items-center">
      <SkeletonBlock width="80px" height="14px" />
      <SkeletonBlock width="36px" height="36px" borderRadius="50%" />
    </div>
    <SkeletonBlock width="70px" height="32px" />
  </div>
);

export const ChartCardSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <SkeletonBlock width="140px" height="18px" />
    <SkeletonBlock width="100%" height={height} borderRadius="8px" />
  </div>
);
