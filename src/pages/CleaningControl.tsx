import React from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { OfflineBanner } from '../components/StatusBanner';
import { PageHeader } from '../components/PageHeader';
import {
  Power,
  OctagonX,
  CheckCircle2,
  ArrowDown,
  PauseCircle,
  ArrowUp,
  Activity,
  Circle,
  Info,
} from 'lucide-react';
import type { CleaningState } from '../types';

// ─── Phase definitions ────────────────────────────────────────────────────────

interface Phase {
  state: CleaningState;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PHASES: Phase[] = [
  {
    state: 'MOVING_DOWN',
    label: 'Moving Down',
    description: 'Brush is traveling down the panel surface',
    icon: <ArrowDown size={12} />,
  },
  {
    state: 'PAUSE_BOTTOM',
    label: 'Paused at Bottom',
    description: 'Brief pause before reversing direction',
    icon: <PauseCircle size={12} />,
  },
  {
    state: 'MOVING_UP',
    label: 'Moving Up',
    description: 'Brush is returning to the top position',
    icon: <ArrowUp size={12} />,
  },
  {
    state: 'PAUSE_TOP',
    label: 'Paused at Top',
    description: 'Cleaning cycle complete — system ready',
    icon: <CheckCircle2 size={12} />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPhaseName = (state: CleaningState | undefined) => {
  switch (state) {
    case 'IDLE':         return 'Idle — Ready';
    case 'MOVING_DOWN':  return 'Moving Down';
    case 'PAUSE_BOTTOM': return 'Paused at Bottom';
    case 'MOVING_UP':    return 'Moving Up';
    case 'PAUSE_TOP':    return 'Paused at Top';
    default:             return 'Unknown';
  }
};

const getPhaseAccentColor = (state: CleaningState | undefined) => {
  switch (state) {
    case 'IDLE':                       return 'var(--accent-green)';
    case 'MOVING_DOWN':
    case 'MOVING_UP':                  return 'var(--accent-blue)';
    case 'PAUSE_BOTTOM':
    case 'PAUSE_TOP':                  return 'var(--accent-amber)';
    default:                           return 'var(--text-muted)';
  }
};

const isPhaseActive = (phase: CleaningState, current: CleaningState | undefined) =>
  current === phase;

const isPhaseCompleted = (phase: CleaningState, current: CleaningState | undefined) => {
  const order: CleaningState[] = ['MOVING_DOWN', 'PAUSE_BOTTOM', 'MOVING_UP', 'PAUSE_TOP'];
  const currentIndex = order.indexOf(current as CleaningState);
  const phaseIndex = order.indexOf(phase);
  return currentIndex > phaseIndex;
};

// ─── Circular Progress (State Indicator) ──────────────────────────────────────

const CircularProgress: React.FC<{
  state: CleaningState | undefined;
  isOnline: boolean;
}> = ({ state, isOnline }) => {
  const accentColor = getPhaseAccentColor(state);
  const radius = 90;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  return (
    <div
      style={{
        position: 'relative',
        width: '220px',
        height: '220px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
      >
        <circle
          stroke="var(--bg-elevated)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={isOnline ? accentColor : 'var(--text-muted)'}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ 
            strokeDashoffset: isOnline && state !== 'IDLE' ? 0 : circumference,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
            animation: isOnline && state !== 'IDLE' && state !== 'PAUSE_TOP' && state !== 'PAUSE_BOTTOM' ? 'pulse 2s infinite' : 'none',
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {/* Inner Info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Status
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px' }}>
          {isOnline && state === 'IDLE' ? (
            <CheckCircle2 size={44} color="var(--accent-green)" />
          ) : isOnline ? (
            <Activity size={44} color={accentColor} />
          ) : (
            <Circle size={44} color="var(--text-muted)" strokeWidth={1.5} />
          )}
        </div>

        <span style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: isOnline ? accentColor : 'var(--text-muted)',
          textAlign: 'center',
          padding: '0 14px',
          lineHeight: 1.3,
        }}>
          {!isOnline ? 'Offline' : getPhaseName(state)}
        </span>
      </div>
    </div>
  );
};

// ─── Phase Timeline ───────────────────────────────────────────────────────────

const PhaseTimeline: React.FC<{ currentState: CleaningState | undefined; isOnline: boolean }> = ({
  currentState,
  isOnline,
}) => {
  return (
    <div className="phase-timeline">
      {/* IDLE row at the top */}
      <div
        className={`phase-item${currentState === 'IDLE' ? ' idle' : ''}`}
        style={{ paddingBottom: '20px' }}
      >
        <div className="phase-dot-wrapper">
          <div className="phase-dot" style={{
            borderColor: currentState === 'IDLE' && isOnline ? 'var(--accent-teal)' : undefined,
            backgroundColor: currentState === 'IDLE' && isOnline ? 'var(--accent-teal-bg)' : undefined,
          }}>
            {currentState === 'IDLE' && isOnline && <CheckCircle2 size={10} color="var(--accent-teal)" />}
          </div>
          {/* Line to next */}
          <div className="phase-line" />
        </div>
        <div className="phase-content">
          <div className="phase-name" style={{ color: currentState === 'IDLE' && isOnline ? 'var(--accent-teal)' : undefined }}>
            Idle — Ready
          </div>
          <div className="phase-desc">System is armed and waiting for cleaning conditions</div>
        </div>
      </div>

      {PHASES.map((phase, index) => {
        const active = isOnline && isPhaseActive(phase.state, currentState);
        const completed = isOnline && isPhaseCompleted(phase.state, currentState);
        const isLast = index === PHASES.length - 1;

        return (
          <div
            key={phase.state}
            className={`phase-item${active ? ' active' : ''}${completed ? ' completed' : ''}`}
            style={isLast ? {} : {}}
          >
            <div className="phase-dot-wrapper">
              <div className="phase-dot">
                {active && <Activity size={10} color="white" />}
                {completed && <CheckCircle2 size={10} color="var(--accent-green)" />}
              </div>
              {!isLast && <div className="phase-line" />}
            </div>
            <div className="phase-content">
              <div className="phase-name">{phase.label}</div>
              <div className="phase-desc">{phase.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Cleaning Conditions ──────────────────────────────────────────────────────

const CleaningConditions: React.FC = () => {
  const { device, isOnline } = useDustZero();

  const sunOk = isOnline && device?.sunlight_level === 'STRONG';
  const rainOk = isOnline && !device?.rain_detected;
  const powerOk = isOnline && device !== null && device.solar_power < 0.05;

  const conditionsMet = sunOk && rainOk && powerOk;

  const rows = [
    {
      label: 'Sunlight',
      value: !isOnline ? '—' : (device?.sunlight_level ?? '—'),
      met: sunOk,
      desc: 'Must be STRONG',
    },
    {
      label: 'Rain',
      value: !isOnline ? '—' : (device?.rain_detected ? 'Detected' : 'None'),
      met: rainOk,
      desc: 'Must be absent',
    },
    {
      label: 'Solar Power',
      value: !isOnline ? '—' : `${device?.solar_power.toFixed(3)} W`,
      met: powerOk,
      desc: 'Must be < 0.05 W',
    },
  ];

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Cleaning Trigger Conditions</h3>
        {isOnline && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: conditionsMet ? 'var(--accent-green-bg)' : 'var(--bg-elevated)',
              color: conditionsMet ? 'var(--accent-green)' : 'var(--text-muted)',
              border: `1px solid ${conditionsMet ? 'var(--accent-green-border)' : 'var(--border-subtle)'}`,
            }}
          >
            {conditionsMet ? 'Conditions Met' : 'Waiting…'}
          </span>
        )}
      </div>

      {rows.map((row) => (
        <div key={row.label} className="condition-row">
          <div>
            <div className="condition-label">{row.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{row.desc}</div>
          </div>
          <div className="condition-right">
            <span className="condition-value">{row.value}</span>
            <div className={`condition-check ${!isOnline ? '' : row.met ? 'met' : 'unmet'}`}>
              {!isOnline ? '—' : row.met ? '✓' : '—'}
            </div>
          </div>
        </div>
      ))}

      {isOnline && conditionsMet && (
        <div style={{
          marginTop: '14px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-green-bg)',
          border: '1px solid var(--accent-green-border)',
          fontSize: '0.85rem',
          color: 'var(--accent-green)',
          fontWeight: 500,
        }}>
          All conditions met — automatic cleaning will proceed when enabled
        </div>
      )}
    </div>
  );
};

// ─── Control Actions ──────────────────────────────────────────────────────────

const ControlActions: React.FC = () => {
  const { isOnline, sendCommand, isLoadingCommand } = useDustZero();

  const handleEnable = () => sendCommand('START_CLEANING');
  const handleStop = () => sendCommand('STOP_CLEANING');

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>System Controls</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Commands are relayed to the ESP32 controller via Supabase.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Enable */}
        <button
          className="btn btn-primary btn-lg"
          onClick={handleEnable}
          disabled={!isOnline || isLoadingCommand}
          style={{ width: '100%', justifyContent: 'center' }}
          aria-label="Enable automatic cleaning mode — clears emergency stop and arms the system"
        >
          <Power size={20} />
          {isLoadingCommand ? 'Sending command…' : 'Enable Automatic Cleaning'}
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0', textAlign: 'center' }}>
          Clears emergency stop and arms automatic mode. Cleaning occurs only when conditions are met.
        </p>

        {/* Separator */}
        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

        {/* Emergency Stop */}
        <div
          style={{
            border: '1px solid var(--accent-red-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            backgroundColor: 'var(--accent-red-bg)',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.95rem', marginBottom: '4px' }}>
              Emergency Stop
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Immediately halts the cleaning motor and latches the stop state.
              The system will NOT automatically resume — you must enable it again.
            </div>
          </div>
          <button
            className="btn btn-danger"
            onClick={handleStop}
            disabled={!isOnline || isLoadingCommand}
            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: '0.95rem', fontWeight: 700 }}
            aria-label="Emergency stop — immediately halts motor and latches stop state"
          >
            <OctagonX size={20} />
            {isLoadingCommand ? 'Sending command…' : 'EMERGENCY STOP'}
          </button>
        </div>
      </div>

      {!isOnline && (
        <div style={{
          marginTop: '14px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-medium)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          Controls disabled — device is offline
        </div>
      )}
    </div>
  );
};

// ─── How it works ─────────────────────────────────────────────────────────────

const HowItWorks: React.FC = () => (
  <div
    style={{
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      marginTop: '0',
    }}
  >
    <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
      <Info size={16} color="var(--accent-blue)" />
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        How Automatic Cleaning Works
      </span>
    </div>
    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      <p style={{ margin: '0 0 8px 0' }}>
        DustZero enables cleaning automatically when <strong>all three</strong> conditions are met:
      </p>
      <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <li>Sunlight is <strong>Strong</strong></li>
        <li>No rain is detected</li>
        <li>Solar output is below <strong>0.05 W</strong> (indicating panel is dusty)</li>
      </ul>
      <p style={{ margin: '10px 0 0 0', color: 'var(--text-muted)' }}>
        Pressing "Enable" does not start the motor immediately — it arms the system.
        The firmware decides when to clean.
      </p>
    </div>
  </div>
);

const CleaningControl: React.FC = () => {
  const { device, isOnline } = useDustZero();

  const cleaningState = isOnline ? device?.cleaning_state : undefined;

  return (
    <div>
      <PageHeader
        title="Cleaning Control"
        subtitle="Monitor and control the automatic cleaning mechanism."
      />

      {/* Banners */}
      <OfflineBanner />

      {/* Main layout: progress + timeline on top */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
          alignItems: 'start',
        }}
      >
        {/* Circular progress card */}
        <div className="card" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <CircularProgress state={cleaningState} isOnline={isOnline} />
        </div>

        {/* Phase timeline card */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem' }}>Cleaning Phases</h3>
          <PhaseTimeline currentState={cleaningState} isOnline={isOnline} />
        </div>
      </div>

      {/* Conditions + Controls side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        <CleaningConditions />
        <ControlActions />
      </div>

      {/* How it works */}
      <HowItWorks />
    </div>
  );
};

export default CleaningControl;
