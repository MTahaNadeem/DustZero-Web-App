import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right }) => {
  return (
    <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
      <div>
        <h2 style={{ margin: 0, marginBottom: subtitle ? '4px' : 0 }}>{title}</h2>
        {subtitle && (
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '6px', lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {right}
        </div>
      )}
    </div>
  );
};
