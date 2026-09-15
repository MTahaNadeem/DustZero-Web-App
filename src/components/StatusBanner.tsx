import React from 'react';
import { WifiOff } from 'lucide-react';
import { useDustZero } from '../contexts/DustZeroContext';
import { formatDistanceToNow } from 'date-fns';

/**
 * OfflineBanner — shown when the device is offline/stale.
 * Prominently explains that live data is unavailable.
 */
export const OfflineBanner: React.FC = () => {
  const { device, isOnline, deviceId } = useDustZero();

  if (isOnline) return null;

  const lastUpdate = device?.updated_at
    ? formatDistanceToNow(new Date(device.updated_at), { addSuffix: true })
    : null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        marginBottom: '20px',
        animation: 'fadeIn 0.3s ease',
      }}
      role="status"
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <WifiOff size={18} color="var(--text-muted)" />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Device Offline
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          No recent data has been received from{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{deviceId}</strong>.
          Live sensor values are temporarily unavailable.
          {lastUpdate && (
            <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
              Last update: {lastUpdate}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Legacy StatusBanner — kept for backwards compatibility.
 * Now composes OfflineBanner.
 */
export const StatusBanner: React.FC = () => {
  const { device, isOnline } = useDustZero();

  // If everything is fine, show nothing (dashboard manages its own banners)
  if (isOnline && device) return null;

  return (
    <>
      <OfflineBanner />
    </>
  );
};
