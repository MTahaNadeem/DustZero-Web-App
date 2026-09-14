import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import type { DeviceHistory } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Zap,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChartCardSkeleton } from '../components/SkeletonBlock';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = '24h' | '7d' | '30d';
type LoadState = 'loading' | 'success' | 'empty' | 'error';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  // Find the raw timestamp from the data point for the full formatted timestamp
  const rawEntry = payload[0]?.payload;
  const fullTimestamp = rawEntry?.recorded_at
    ? format(new Date(rawEntry.recorded_at), 'MMM d, yyyy  h:mm a')
    : label;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated)',
        padding: '14px 18px',
        border: '1px solid var(--border-medium)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '160px',
      }}
    >
      {/* Full timestamp */}
      <p
        style={{
          margin: '0 0 12px 0',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          fontSize: '0.78rem',
          letterSpacing: '0.02em',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
        }}
      >
        {fullTimestamp}
      </p>
      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: index < payload.length - 1 ? '6px' : 0 }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            {entry.name}:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {entry.value !== null && entry.value !== undefined ? entry.value : '—'}
            </strong>
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Offline Notice Banner ────────────────────────────────────────────────────

const OfflineNotice: React.FC<{ lastSeen: string | null }> = ({ lastSeen }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      marginBottom: '24px',
      fontSize: '0.85rem',
    }}
  >
    <WifiOff size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    <span style={{ color: 'var(--text-secondary)' }}>
      <strong style={{ color: 'var(--text-primary)' }}>Device offline</strong>
      {lastSeen && (
        <span style={{ color: 'var(--text-muted)' }}>
          {' '}— last seen {lastSeen}.{' '}
        </span>
      )}
      Historical data is still available from previous sessions.
    </span>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ timeRange: TimeRange; isOffline: boolean }> = ({
  timeRange,
  isOffline,
}) => {
  const rangeLabel =
    timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days';

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '64px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Activity size={28} color="var(--text-muted)" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
          No Historical Data
        </h3>
        <p
          className="text-secondary"
          style={{ fontSize: '0.9rem', margin: 0, maxWidth: '400px', lineHeight: 1.6 }}
        >
          {isOffline
            ? `No historical snapshots found for the last ${rangeLabel}. Try switching to a longer time range — data from before the device went offline may appear under 7D or 30D.`
            : `No measurements have been recorded in the last ${rangeLabel}. Once the device starts sending data and history snapshots are saved, your performance trends will appear here.`}
        </p>
      </div>
    </div>
  );
};

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="card"
    style={{
      backgroundColor: 'var(--accent-amber-bg)',
      border: '1px solid var(--accent-amber-border)',
      padding: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      marginBottom: '24px',
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-amber-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <AlertTriangle size={18} color="var(--accent-amber)" />
    </div>
    <div style={{ flex: 1 }}>
      <h3
        style={{ color: 'var(--accent-amber)', margin: '0 0 6px 0', fontSize: '1rem' }}
      >
        Unable to Load Historical Data
      </h3>
      <p
        style={{
          margin: '0 0 14px 0',
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      <button className="btn btn-outline btn-sm" onClick={onRetry}>
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  </div>
);

// ─── Summary Metric Card ──────────────────────────────────────────────────────

interface SummaryMetricProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  accentColor: string;
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({
  label,
  value,
  subtext,
  icon,
  accentColor,
}) => (
  <div
    className="card"
    style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
      {value}
    </div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtext}</div>
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  height = 280,
}) => (
  <div
    className="card"
    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}
  >
    <div style={{ marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
      {subtitle && (
        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
    <div style={{ height }}>{children}</div>
  </div>
);

// ─── Axis + Grid shared styles ────────────────────────────────────────────────

const AXIS_STYLE = {
  stroke: 'var(--text-muted)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const GRID_STYLE = {
  strokeDasharray: '4 4',
  stroke: 'var(--border-subtle)',
  vertical: false,
} as const;

// ─── Helper: build correct start time ────────────────────────────────────────

/**
 * Returns the start-of-range Date for the selected time range.
 * BUG FIX: The previous implementation used setHours(now.getHours() - 24)
 * which only subtracts hours-of-day (not a real 24h window), causing
 * data from yesterday to disappear on the 24H view.
 * The correct approach is to subtract from Date.now() in milliseconds.
 */
const getRangeStartTime = (timeRange: TimeRange): Date => {
  const now = Date.now();
  switch (timeRange) {
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
};

// ─── Helper: format x-axis tick ──────────────────────────────────────────────

const formatXLabel = (recorded_at: string, timeRange: TimeRange): string => {
  const d = new Date(recorded_at);
  if (timeRange === '24h') return format(d, 'HH:mm');
  if (timeRange === '7d') return format(d, 'MMM d, HH:mm');
  return format(d, 'MMM d');
};

// ─── Analytics Page ───────────────────────────────────────────────────────────

const Analytics: React.FC = () => {
  // Analytics NEVER depends on isOnline to load historical data.
  // isOnline is used only for the informational offline notice.
  const { deviceId, isOnline, device } = useDustZero();

  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ── Fetch historical data independently of device online status ─────────────
  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;

    setLoadState('loading');
    setErrorMessage('');

    const startTime = getRangeStartTime(timeRange);

    try {
      const { data, error: fetchError } = await supabase
        .from('device_history')
        .select('*')
        .eq('device_id', deviceId)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true });

      if (fetchError) {
        // Surface specific, actionable errors
        if (fetchError.code === '42P01') {
          setErrorMessage(
            'The device_history table was not found in Supabase. ' +
              'Please refer to the README to set up the device_history table and Edge Function.'
          );
        } else {
          setErrorMessage(
            `Query failed: ${fetchError.message || 'Unknown error'}. Check your connection and try again.`
          );
        }
        setLoadState('error');
        return;
      }

      const records = (data as DeviceHistory[]) || [];
      setHistory(records);
      setLoadState(records.length === 0 ? 'empty' : 'success');
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setErrorMessage('Failed to load historical data. Check your connection and try again.');
      setLoadState('error');
    }
  }, [deviceId, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Build chart-ready data ──────────────────────────────────────────────────
  // Keep recorded_at in each point so the tooltip can show the full timestamp.
  // Insert null-separator rows for gaps > 6 minutes (360 seconds).
  const chartData = useMemo(() => {
    const result: any[] = [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i];

      // Gap detection: insert a null row to break chart line
      if (i > 0) {
        const prev = history[i - 1];
        const gapMs =
          new Date(h.recorded_at).getTime() - new Date(prev.recorded_at).getTime();
        if (gapMs > 6 * 60 * 1000) {
          result.push({
            recorded_at: null,
            timeLabel: '',
            solar_power: null,
            solar_voltage: null,
            solar_current: null,
            temperature: null,
          });
        }
      }

      result.push({
        ...h,
        // Clamp bad electrical values — negative power/voltage/current = invalid
        solar_power: Math.max(0, h.solar_power),
        solar_voltage: Math.max(0, h.solar_voltage),
        solar_current: Math.max(0, h.solar_current),
        // temperature: preserve as-is (may legitimately be below 0°C)
        timeLabel: formatXLabel(h.recorded_at, timeRange),
      });
    }
    return result;
  }, [history, timeRange]);

  // ── Summary metrics from historical range ──────────────────────────────────
  const summaryMetrics = useMemo(() => {
    if (history.length === 0) return null;
    const powers = history.map((h) => Math.max(0, h.solar_power));
    const temps = history.map((h) => h.temperature);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const peakPower = Math.max(...powers);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const peakTemp = Math.max(...temps);
    return { avgPower, peakPower, avgTemp, peakTemp };
  }, [history]);

  // ── Last seen string ───────────────────────────────────────────────────────
  const lastSeen = device?.updated_at
    ? formatDistanceToNow(new Date(device.updated_at), { addSuffix: true })
    : null;

  // ── Header right: time-range segmented control ─────────────────────────────
  const headerRight = (
    <div className="segmented-control">
      {(['24h', '7d', '30d'] as const).map((range) => (
        <button
          key={range}
          className={timeRange === range ? 'active' : ''}
          onClick={() => setTimeRange(range)}
          aria-pressed={timeRange === range}
          aria-label={`Show ${range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '30 days'} of history`}
        >
          {range.toUpperCase()}
        </button>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Historical performance and sensor data — independent of current device status."
        right={headerRight}
      />

      {/* Offline informational notice (NOT a blocker) */}
      {!isOnline && <OfflineNotice lastSeen={lastSeen} />}

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loadState === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '4px',
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="card skeleton"
                style={{ height: '90px', padding: 0 }}
              />
            ))}
          </div>
          <ChartCardSkeleton height={260} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            <ChartCardSkeleton height={240} />
            <ChartCardSkeleton height={240} />
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {loadState === 'error' && (
        <ErrorState message={errorMessage} onRetry={fetchHistory} />
      )}

      {/* ── Empty ─────────────────────────────────────────────────────────── */}
      {loadState === 'empty' && (
        <EmptyState timeRange={timeRange} isOffline={!isOnline} />
      )}

      {/* ── Success: show charts ───────────────────────────────────────────── */}
      {loadState === 'success' && (
        <div>
          {/* Summary metrics row */}
          {summaryMetrics && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              <SummaryMetric
                label="Avg Power"
                value={`${summaryMetrics.avgPower.toFixed(4)} W`}
                subtext={`Over ${history.length} snapshots`}
                icon={<Zap size={15} />}
                accentColor="var(--accent-amber)"
              />
              <SummaryMetric
                label="Peak Power"
                value={`${summaryMetrics.peakPower.toFixed(4)} W`}
                subtext="Highest recorded"
                icon={<TrendingUp size={15} />}
                accentColor="var(--accent-green)"
              />
              <SummaryMetric
                label="Avg Temperature"
                value={`${summaryMetrics.avgTemp.toFixed(1)} °C`}
                subtext="Mean ambient"
                icon={<Thermometer size={15} />}
                accentColor="var(--accent-red)"
              />
              <SummaryMetric
                label="Peak Temperature"
                value={`${summaryMetrics.peakTemp.toFixed(1)} °C`}
                subtext="Highest recorded"
                icon={<Activity size={15} />}
                accentColor="var(--accent-purple)"
              />
            </div>
          )}

          {/* Record count info */}
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '16px',
            }}
          >
            {history.length} snapshot{history.length !== 1 ? 's' : ''} in selected range
            {' '}·{' '}
            {history.length > 0 &&
              `${format(new Date(history[0].recorded_at), 'MMM d, HH:mm')} → ${format(new Date(history[history.length - 1].recorded_at), 'MMM d, HH:mm')}`}
          </div>

          {/* Solar Power Chart */}
          <ChartCard
            title="Solar Power"
            subtitle="Historical output power in Watts"
            height={260}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="timeLabel"
                  {...AXIS_STYLE}
                  dy={8}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis {...AXIS_STYLE} dx={-4} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="solar_power"
                  name="Power (W)"
                  stroke="var(--accent-amber)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPower)"
                  connectNulls={false}
                  dot={history.length <= 60 ? { fill: 'var(--accent-amber)', r: 3, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: 'var(--accent-amber)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Voltage & Current | Temperature */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Voltage & Current */}
            <ChartCard
              title="Voltage & Current"
              subtitle="Voltage in V (left) and Current in A (right)"
              height={240}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 16, left: -16, bottom: 4 }}
                >
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis
                    dataKey="timeLabel"
                    {...AXIS_STYLE}
                    dy={8}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    yAxisId="v"
                    {...AXIS_STYLE}
                    dx={-4}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    yAxisId="a"
                    orientation="right"
                    {...AXIS_STYLE}
                    dx={4}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    yAxisId="v"
                    type="monotone"
                    dataKey="solar_voltage"
                    name="Voltage (V)"
                    stroke="var(--accent-blue)"
                    strokeWidth={2}
                    dot={history.length <= 60 ? { fill: 'var(--accent-blue)', r: 3, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: 'var(--accent-blue)' }}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="a"
                    type="monotone"
                    dataKey="solar_current"
                    name="Current (A)"
                    stroke="var(--accent-purple)"
                    strokeWidth={2}
                    dot={history.length <= 60 ? { fill: 'var(--accent-purple)', r: 3, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: 'var(--accent-purple)' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Temperature */}
            <ChartCard
              title="Temperature"
              subtitle="Ambient temperature in °C"
              height={240}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis
                    dataKey="timeLabel"
                    {...AXIS_STYLE}
                    dy={8}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    {...AXIS_STYLE}
                    dx={-4}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    name="Temp (°C)"
                    stroke="var(--accent-red)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                    connectNulls={false}
                    dot={history.length <= 60 ? { fill: 'var(--accent-red)', r: 3, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: 'var(--accent-red)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
