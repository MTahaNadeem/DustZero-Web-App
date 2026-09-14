import React from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { AlertCircle, Info, AlertTriangle, CheckCircle2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/PageHeader';
import type { AlertSeverity } from '../types';

// ─── Alert card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  read: boolean;
  onDismiss: (id: string) => void;
}

const getAlertVisuals = (severity: AlertSeverity) => {
  switch (severity) {
    case 'critical':
      return {
        icon: <AlertCircle size={18} color="var(--accent-red)" />,
        iconBg: 'var(--accent-red-dim)',
        borderColor: 'var(--accent-red-border)',
        cardBg: 'var(--accent-red-bg)',
        titleColor: 'var(--accent-red)',
      };
    case 'warning':
      return {
        icon: <AlertTriangle size={18} color="var(--accent-amber)" />,
        iconBg: 'var(--accent-amber-dim)',
        borderColor: 'var(--accent-amber-border)',
        cardBg: 'var(--accent-amber-bg)',
        titleColor: 'var(--accent-amber)',
      };
    case 'info':
    default:
      return {
        icon: <Info size={18} color="var(--accent-blue)" />,
        iconBg: 'var(--accent-blue-dim)',
        borderColor: 'var(--accent-blue-border)',
        cardBg: 'var(--accent-blue-bg)',
        titleColor: 'var(--accent-blue)',
      };
  }
};

const AlertCard: React.FC<AlertCardProps> = ({
  id,
  message,
  severity,
  timestamp,
  read,
  onDismiss,
}) => {
  const v = getAlertVisuals(severity);

  return (
    <div
      style={{
        backgroundColor: read ? 'var(--bg-elevated)' : v.cardBg,
        border: `1px solid ${read ? 'var(--border-subtle)' : v.borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        opacity: read ? 0.65 : 1,
        transition: 'opacity 0.2s ease',
        animation: 'fadeIn 0.25s ease',
      }}
      role="article"
    >
      {/* Icon badge */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: read ? 'var(--bg-card)' : v.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
          border: `1px solid ${read ? 'var(--border-subtle)' : v.borderColor}`,
        }}
      >
        {v.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: read ? 'var(--text-secondary)' : v.titleColor,
            marginBottom: '4px',
            lineHeight: 1.3,
          }}
        >
          {message}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </div>
      </div>

      {/* Dismiss */}
      {!read && (
        <button
          onClick={() => onDismiss(id)}
          className="btn btn-ghost btn-sm"
          style={{ flexShrink: 0, fontSize: '0.8rem', padding: '5px 10px' }}
          aria-label="Mark as read"
        >
          Mark read
        </button>
      )}
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyAlerts: React.FC = () => (
  <div
    className="card"
    style={{
      textAlign: 'center',
      padding: '64px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}
  >
    <div
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-green-bg)',
        border: '1px solid var(--accent-green-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CheckCircle2 size={28} color="var(--accent-green)" />
    </div>
    <div>
      <h3 style={{ margin: '0 0 8px 0' }}>All Clear</h3>
      <p className="text-secondary" style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
        No alerts recorded in this session.
        <br />
        Alerts appear when device state changes — such as rain detection, faults, or connectivity changes.
      </p>
    </div>
  </div>
);

// ─── Alerts Page ──────────────────────────────────────────────────────────────

const Alerts: React.FC = () => {
  const { alerts, dismissAlert } = useDustZero();
  const unreadCount = alerts.filter((a) => !a.read).length;

  // Header right: unread count badge
  const headerRight = unreadCount > 0 ? (
    <div
      style={{
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--accent-red-bg)',
        border: '1px solid var(--accent-red-border)',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: 'var(--accent-red)',
      }}
    >
      {unreadCount} Unread
    </div>
  ) : (
    <div
      style={{
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--text-muted)',
      }}
    >
      All read
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Session activity log — alerts reset when the page is refreshed."
        right={headerRight}
      />

      {/* Session-only disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          fontSize: '0.825rem',
          color: 'var(--text-muted)',
        }}
      >
        <Bell size={14} color="var(--text-muted)" />
        Alerts are session-only and not persisted to the database. They reflect real device state transitions during this session.
      </div>

      {alerts.length === 0 ? (
        <EmptyAlerts />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              id={alert.id}
              message={alert.message}
              severity={alert.severity}
              timestamp={alert.timestamp}
              read={alert.read}
              onDismiss={dismissAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
