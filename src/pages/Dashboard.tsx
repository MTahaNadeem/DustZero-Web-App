import { useEffect, useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { OfflineBanner } from '../components/StatusBanner';
import { MetricCard } from '../components/MetricCard';
import { PageHeader } from '../components/PageHeader';
import {
  Zap,
  Thermometer,
  Sun,
  CloudRain,
  Power,
  OctagonX,
  Gauge,
  Activity,
  Percent,
  CloudLightning,
  MapPin,
  CloudDrizzle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ConfirmationModal } from '../components/ConfirmationModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPhaseName = (state: string | undefined) => {
  switch (state) {
    case 'IDLE':         return 'Idle — Ready';
    case 'MOVING_DOWN':  return 'Moving Down';
    case 'PAUSE_BOTTOM': return 'Paused at Bottom';
    case 'MOVING_UP':    return 'Moving Up';
    case 'PAUSE_TOP':    return 'Paused at Top';
    default:             return 'Unknown';
  }
};

const getSunlightColor = (level: string | undefined) => {
  switch (level) {
    case 'STRONG': return 'var(--accent-amber)';
    case 'MEDIUM': return 'var(--accent-blue)';
    case 'WEAK':   return 'var(--text-muted)';
    default:       return 'var(--text-muted)';
  }
};

const getSunlightLabel = (level: string | undefined) => {
  switch (level) {
    case 'STRONG': return 'Strong';
    case 'MEDIUM': return 'Medium';
    case 'WEAK':   return 'Weak';
    default:       return '—';
  }
};

const getPhaseAccent = (state: string | undefined) => {
  switch (state) {
    case 'IDLE':         return 'var(--accent-green)';
    case 'MOVING_DOWN':
    case 'MOVING_UP':   return 'var(--accent-blue)';
    case 'PAUSE_BOTTOM':
    case 'PAUSE_TOP':   return 'var(--accent-amber)';
    default:            return 'var(--text-muted)';
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Hero card — Solar Power is the primary metric.
 */
const HeroPowerCard = () => {
  const { device, isOnline } = useDustZero();
  const power = isOnline ? device?.solar_power ?? 0 : null;

  const getStatusLabel = () => {
    if (!isOnline || power === null) return null;
    if (power < 0.05) return { label: 'Low Output', color: 'var(--accent-amber)' };
    if (power < 1) return { label: 'Moderate', color: 'var(--accent-blue)' };
    return { label: 'Optimal', color: 'var(--accent-green)' };
  };

  const status = getStatusLabel();

  return (
    <div
      className="card"
      style={{
        background: isOnline
          ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.04) 100%)'
          : 'var(--bg-card)',
        marginBottom: '20px',
        padding: '28px 32px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: isOnline ? 'var(--accent-amber-bg)' : 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: isOnline ? 'var(--accent-amber-border)' : 'var(--border-subtle)',
            }}
          >
            <Zap size={20} color={isOnline ? 'var(--accent-amber)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Solar Power
            </div>
          </div>
        </div>
        {status && (
          <div
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: `${status.color}15`,
              border: `1px solid ${status.color}40`,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: status.color,
            }}
          >
            {status.label}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2" style={{ marginBottom: '8px' }}>
        {!isOnline || power === null ? (
          <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1, letterSpacing: '-0.04em' }}>
            —
          </span>
        ) : (
          <>
            <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.04em' }}>
              {power.toFixed(3)}
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>W</span>
          </>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
        {!isOnline ? 'No live data — device is offline' : 'Current solar panel output'}
      </p>
    </div>
  );
};

/**
 * Panel Efficiency Card - compares current power to clean baseline
 */
const PanelEfficiencyCard = () => {
  const { device, isOnline, deviceId } = useDustZero();
  const [baselinePower, setBaselinePower] = useState<number | null>(null);
  
  const sunlightLevel = device?.sunlight_level;
  const currentPower = device?.solar_power;

  useEffect(() => {
    const fetchBaseline = async () => {
      if (!deviceId || !sunlightLevel) return;
      const { data } = await supabase
        .from('device_baselines')
        .select('baseline_power')
        .eq('device_id', deviceId)
        .eq('sunlight_level', sunlightLevel)
        .single();
      
      if (data) {
        setBaselinePower(data.baseline_power);
      } else {
        setBaselinePower(null);
      }
    };
    
    fetchBaseline();
  }, [deviceId, sunlightLevel]);

  if (!isOnline || !sunlightLevel || !currentPower) return null;

  let efficiency = 0;
  let statusColor = 'var(--text-muted)';
  let verdict = 'Calculating...';

  if (baselinePower) {
    efficiency = Math.min(100, Math.round((currentPower / baselinePower) * 100));
    if (efficiency > 85) {
      statusColor = 'var(--accent-green)';
      verdict = 'Clean & Efficient';
    } else if (efficiency > 60) {
      statusColor = 'var(--accent-amber)';
      verdict = 'Slight Dust Accumulation';
    } else {
      statusColor = 'var(--accent-red)';
      verdict = 'Dusty — Cleaning Recommended';
    }
  }

  return (
    <div className="card" style={{ marginBottom: '20px', padding: '24px 32px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Percent size={18} color="var(--text-primary)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Panel Efficiency</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Based on {getSunlightLabel(sunlightLevel).toLowerCase()} sunlight baseline
          </p>
        </div>
      </div>
      
      {!baselinePower ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            No baseline calibrated for <strong>{getSunlightLabel(sunlightLevel)}</strong> sunlight.
            Go to Settings to calibrate when the panel is clean.
          </p>
        </div>
      ) : (
        <div className="flex items-end gap-6">
          <div className="flex items-baseline gap-1">
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: statusColor, lineHeight: 1 }}>{efficiency}</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: statusColor }}>%</span>
          </div>
          <div style={{ paddingBottom: '6px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: statusColor }}>{verdict}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Current: {currentPower.toFixed(3)}W / Baseline: {baselinePower.toFixed(3)}W
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Weather Forecast Card
 */
const WeatherCard = () => {
  const { device } = useDustZero();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!device?.latitude || !device?.longitude) {
        setWeather(null);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const { data, error } = await supabase.functions.invoke(`get-weather?lat=${device.latitude}&lon=${device.longitude}`, {
          method: 'GET'
        });
        
        if (error) throw error;
        
        let rainExpectedInHours = null;
        let willBeClear = false;

        if (data.next_12_hours && Array.isArray(data.next_12_hours)) {
          // Find first block where pop >= 50 or conditions include 'Rain'
          const rainBlock = data.next_12_hours.find((b: any) => b.pop >= 50 || b.conditions.toLowerCase().includes('rain'));
          
          if (rainBlock) {
            const blockTime = new Date(rainBlock.dt * 1000);
            const now = new Date();
            const diffHours = Math.max(1, Math.round((blockTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
            rainExpectedInHours = diffHours;
          } else {
            willBeClear = true;
          }
        }

        setWeather({
          current: {
            temp: data.current.temp,
            description: data.current.description
          },
          forecast: {
            rainExpectedInHours,
            willBeClear
          }
        });
      } catch (err) {
        console.error('Failed to fetch weather', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch initially and set interval for every 30 minutes
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [device?.latitude, device?.longitude]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: 'var(--accent-purple-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--accent-purple-border)',
          }}
        >
          <CloudDrizzle size={16} color="var(--accent-purple)" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Weather Forecast</h3>
        </div>
      </div>

      {!device?.latitude || !device?.longitude ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Location not set. Go to <strong>Settings</strong> to set your device location for weather insights.
          </p>
        </div>
      ) : loading && !weather ? (
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading weather data...</div>
      ) : error || !weather ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Weather data currently unavailable.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex items-center justify-between" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {weather.current.temp ? `${Math.round(weather.current.temp)}°C` : '—'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {weather.current.description || 'Current conditions'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <MapPin size={12} /> {Math.abs(device.latitude).toFixed(2)}°{device.latitude >= 0 ? 'N' : 'S'}, {Math.abs(device.longitude).toFixed(2)}°{device.longitude >= 0 ? 'E' : 'W'}
              </div>
            </div>
          </div>
          
          <div>
            {weather.forecast.rainExpectedInHours !== null ? (
              <div style={{ backgroundColor: 'var(--accent-blue-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-blue-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                  <CloudLightning size={16} /> Rain Expected
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Rain expected in ~{weather.forecast.rainExpectedInHours} hours — automatic cleaning will be blocked during rainfall.
                </div>
              </div>
            ) : weather.forecast.willBeClear ? (
              <div style={{ backgroundColor: 'var(--accent-green-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-green-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                  <Sun size={16} /> Clear Skies
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Clear skies for the next 12 hours — good conditions for automatic cleaning.
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                No significant weather events expected in the next 12 hours.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Environment card — sunlight level, rain, LDR readings
 */
const EnvironmentCard = () => {
  const { device, isOnline } = useDustZero();

  const rainDetected = isOnline ? device?.rain_detected : null;
  const sunlightLevel = isOnline ? device?.sunlight_level : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Title */}
      <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: 'var(--accent-amber-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--accent-amber-border)',
          }}
        >
          <Sun size={16} color="var(--accent-amber)" />
        </div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Environment</h3>
      </div>

      {/* Sunlight */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sunlight</span>
          {!isOnline ? (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
          ) : (
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: getSunlightColor(sunlightLevel ?? undefined) }}>
              {getSunlightLabel(sunlightLevel ?? undefined)}
            </span>
          )}
        </div>
      </div>

      {/* Rain */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Rain</span>
          {!isOnline || rainDetected === null ? (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
          ) : (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: rainDetected ? 'var(--accent-blue-bg)' : 'var(--accent-green-bg)',
                color: rainDetected ? 'var(--accent-blue)' : 'var(--accent-green)',
                border: `1px solid ${rainDetected ? 'var(--accent-blue-border)' : 'var(--accent-green-border)'}`,
              }}
            >
              {rainDetected ? 'Detected' : 'Clear'}
            </span>
          )}
        </div>
        {isOnline && rainDetected && (
          <p style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', marginTop: '6px', margin: '6px 0 0 0' }}>
            Cleaning blocked while rain is present
          </p>
        )}
      </div>

      {/* LDR readings */}
      <div style={{ padding: '12px 0' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>LDR Sensors</span>
          <span style={{ fontSize: '0.85rem', color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {!isOnline ? '— / —' : `${device?.ldr1 ?? '—'} / ${device?.ldr2 ?? '—'}`}
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', margin: '4px 0 0 0' }}>
          LDR 1 / LDR 2 (raw sensor values)
        </p>
      </div>
    </div>
  );
};

/**
 * Cleaning status card — compact view for dashboard
 */
const CleaningStatusCard = () => {
  const { device, isOnline, sendCommand, isLoadingCommand, isManualCleaning } = useDustZero();

  const state = isOnline ? device?.cleaning_state : undefined;
  const phaseColor = getPhaseAccent(state);
  const isIdle = state === 'IDLE' || !state;

  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isRainBlockedModalOpen, setIsRainBlockedModalOpen] = useState(false);

  const handleEnable = () => sendCommand('START_CLEANING');
  
  const handleStartManualClick = () => {
    if (device?.rain_detected) {
      setIsRainBlockedModalOpen(true);
    } else {
      setIsStartModalOpen(true);
    }
  };
  
  const handleStopClick = () => setIsStopModalOpen(true);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Title */}
      <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: 'var(--accent-blue-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--accent-blue-border)',
          }}
        >
          <Gauge size={16} color="var(--accent-blue)" />
        </div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Cleaning System</h3>
      </div>

      {/* Phase + progress */}
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Mini circular progress */}
        <div
          style={{
            position: 'relative',
            width: '52px',
            height: '52px',
            flexShrink: 0,
            borderRadius: '50%',
            background: isOnline
              ? phaseColor
              : 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color={isOnline ? phaseColor : 'var(--text-muted)'} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Current Phase</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isOnline ? phaseColor : 'var(--text-muted)' }}>
            {!isOnline ? '—' : getPhaseName(state)}
          </div>
        </div>

        {/* Status Text overlay */}
        <div className="hero-status">
          {isOnline && isIdle && (
            <span style={{ color: 'var(--accent-green)' }}>System Normal &bull; Ready</span>
          )}
          {isOnline && !isIdle && (
            <span style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={12} className="animate-pulse" />
              {isManualCleaning ? 'Manual Cleaning' : 'Cleaning in progress'} ({device?.cleaning_state})
            </span>
          )}
          {!isOnline && (
            <span style={{ color: 'var(--text-muted)' }}>No live data available</span>
          )}
        </div>
      </div>

      {/* Progress bar placeholder */}
      {isOnline && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ height: '5px', borderRadius: '99px', backgroundColor: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: state !== 'IDLE' ? '100%' : '0%',
                borderRadius: '99px',
                backgroundColor: phaseColor,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem' }}
          onClick={handleStartManualClick}
          disabled={!isOnline || isLoadingCommand || !isIdle}
          title="Immediately start a manual cleaning cycle"
        >
          <Power size={15} />
          {isLoadingCommand ? 'Sending…' : 'Start Manual'}
        </button>
        <button
          className="btn"
          style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          onClick={handleEnable}
          disabled={!isOnline || isLoadingCommand}
          title="Clears emergency stop and arms automatic cleaning mode"
        >
          Enable Auto
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem' }}
          onClick={handleStopClick}
          disabled={!isOnline || isLoadingCommand}
          title="Immediately halt the cleaning mechanism"
        >
          <OctagonX size={15} />
          {isLoadingCommand ? 'Sending…' : 'Stop'}
        </button>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={isStartModalOpen}
        title="Start Manual Cleaning?"
        description="This will immediately start a solar panel cleaning cycle."
        confirmLabel="Start Cleaning"
        onConfirm={() => sendCommand('START_MANUAL_CLEANING')}
        onCancel={() => setIsStartModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isStopModalOpen}
        title="Stop Cleaning?"
        description="Are you sure you want to stop the current cleaning cycle?"
        confirmLabel="Stop Cleaning"
        isDestructive={true}
        onConfirm={() => sendCommand('STOP_CLEANING')}
        onCancel={() => setIsStopModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isRainBlockedModalOpen}
        title="Cleaning Blocked"
        description="Rain has been detected. Cleaning cannot be started while the panel is wet."
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setIsRainBlockedModalOpen(false)}
        onCancel={() => setIsRainBlockedModalOpen(false)}
      />
    </div>
  );
};

/**
 * Panel health summary card
 */
const PanelHealthCard = () => {
  const { device, isOnline } = useDustZero();

  const rows: Array<{ label: string; value: string; ok: boolean | null }> = [
    {
      label: 'Sunlight',
      value: !isOnline ? '—' : getSunlightLabel(device?.sunlight_level),
      ok: !isOnline ? null : device?.sunlight_level === 'STRONG',
    },
    {
      label: 'Rain',
      value: !isOnline ? '—' : (device?.rain_detected ? 'Detected' : 'None'),
      ok: !isOnline ? null : !device?.rain_detected,
    },
    {
      label: 'Power Output',
      value: !isOnline ? '—' : `${device?.solar_power.toFixed(3)} W`,
      ok: !isOnline ? null : true,
    },
    {
      label: 'System Status',
      value: !isOnline ? 'Offline' : 'Online',
      ok: !isOnline ? null : true,
    },
  ];

  const allGood = isOnline && rows.every((r) => r.ok !== false);

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Title + overall status */}
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Panel Health</h3>
        {isOnline && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: allGood ? 'var(--accent-green-bg)' : 'var(--accent-amber-bg)',
              color: allGood ? 'var(--accent-green)' : 'var(--accent-amber)',
              border: `1px solid ${allGood ? 'var(--accent-green-border)' : 'var(--accent-amber-border)'}`,
            }}
          >
            {allGood ? 'Operating Normally' : 'Check Required'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between"
            style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {row.label}
            </span>
            <div className="flex items-center gap-8">
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '70px', textAlign: 'right' }}>
                {row.value}
              </span>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    row.ok === null ? 'var(--text-muted)' :
                    row.ok ? 'var(--accent-green)' : 'var(--accent-amber)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const { device, isOnline, deviceId } = useDustZero();
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!device?.updated_at) return;
    const update = () => {
      setLastUpdated(formatDistanceToNow(new Date(device.updated_at), { addSuffix: true }));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [device?.updated_at]);

  // Header right slot: status badge + last update
  const headerRight = (
    <div className="flex items-center gap-3 flex-wrap" style={{ justifyContent: 'flex-end' }}>
      {isOnline && lastUpdated && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {lastUpdated.replace('about ', '')}
        </span>
      )}
      <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot" />
        {isOnline ? 'Online' : 'Offline'}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Monitoring ${deviceId} — real-time solar panel and cleaning system data.`}
        right={headerRight}
      />

      {/* Banners */}
      <OfflineBanner />

      {/* Hero Power Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <HeroPowerCard />
        {isOnline && <PanelEfficiencyCard />}
      </div>

      {/* Metric Cards — 4 columns on wide, 2 on medium, 1 on narrow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <MetricCard
          title="Voltage"
          value={device?.solar_voltage.toFixed(2) ?? '0.00'}
          unit="V"
          icon={<Activity size={18} />}
          isOffline={!isOnline}
          accentColor="blue"
          subtitle="Panel voltage"
        />
        <MetricCard
          title="Current"
          value={device?.solar_current.toFixed(3) ?? '0.000'}
          unit="A"
          icon={<Zap size={18} />}
          isOffline={!isOnline}
          accentColor="purple"
          subtitle="Output current"
        />
        <MetricCard
          title="Temperature"
          value={device?.temperature.toFixed(1) ?? '0.0'}
          unit="°C"
          icon={<Thermometer size={18} />}
          isOffline={!isOnline}
          accentColor="red"
          subtitle="Ambient temperature"
        />
        <MetricCard
          title="LDR Average"
          value={device ? Math.round((device.ldr1 + device.ldr2) / 2).toString() : '0'}
          unit=""
          icon={<Sun size={18} />}
          isOffline={!isOnline}
          accentColor="amber"
          subtitle="Light sensor avg"
        />
      </div>

      {/* Bottom row: Environment | Cleaning System | Weather */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <EnvironmentCard />
        <CleaningStatusCard />
        <WeatherCard />
      </div>

      {/* Panel Health */}
      <PanelHealthCard />

      {/* Rain warning if applicable */}
      {isOnline && device?.rain_detected && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'var(--accent-blue-bg)',
            border: '1px solid var(--accent-blue-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <CloudRain size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
              Rain Detected
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
              Automatic cleaning is blocked to protect the solar panel and mechanism.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
