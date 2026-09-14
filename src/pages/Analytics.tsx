import { useEffect, useState, useCallback } from 'react';
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
import { format } from 'date-fns';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChartCardSkeleton } from '../components/SkeletonBlock';

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          padding: '14px 18px',
          border: '1px solid var(--border-medium)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '140px',
        }}
      >
        <p style={{ margin: '0 0 10px 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: entry.color,
                flexShrink: 0,
              }}
            />
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              {entry.name}:{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {entry.value !== null ? entry.value : 'offline'}
              </span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ timeRange: string }> = ({ timeRange }) => (
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
      <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No Historical Data</h3>
      <p className="text-secondary" style={{ fontSize: '0.9rem', margin: '0', maxWidth: '380px', lineHeight: 1.6 }}>
        DustZero hasn't collected enough historical measurements for the last{' '}
        <strong>{timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}</strong>.
        Once data is available, your performance trends will appear here.
      </p>
    </div>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
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
      <h3 style={{ color: 'var(--accent-amber)', margin: '0 0 6px 0', fontSize: '1rem' }}>
        Data Unavailable
      </h3>
      <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
        {message}
      </p>
      <button className="btn btn-outline btn-sm" onClick={onRetry}>
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, height = 280 }) => (
  <div
    className="card"
    style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}
  >
    <div style={{ marginBottom: '8px' }}>
      <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
      {subtitle && (
        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
    <div style={{ flex: 1, height }}>
      {children}
    </div>
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

// ─── Analytics Page ───────────────────────────────────────────────────────────

const Analytics = () => {
  const { deviceId } = useDustZero();
  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = new Date();
    let startTime = new Date();
    if (timeRange === '24h') startTime.setHours(now.getHours() - 24);
    else if (timeRange === '7d') startTime.setDate(now.getDate() - 7);
    else if (timeRange === '30d') startTime.setDate(now.getDate() - 30);

    try {
      const { data, error: fetchError } = await supabase
        .from('device_history')
        .select('*')
        .eq('device_id', deviceId)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true });

      if (fetchError) throw fetchError;

      setHistory((data as DeviceHistory[]) || []);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      if (err.code === '42P01') {
        setError(
          'Historical data table not found. Please refer to the README to set up the device_history table and Edge Function.'
        );
      } else {
        setError('Failed to load historical data. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId, timeRange]);

  useEffect(() => {
    if (deviceId) {
      fetchHistory();
    }
  }, [fetchHistory, deviceId]);

  // Build chart data with offline gap markers
  const chartData: any[] = [];
  for (let i = 0; i < history.length; i++) {
    const h = history[i];

    if (i > 0) {
      const prev = history[i - 1];
      const gap = new Date(h.recorded_at).getTime() - new Date(prev.recorded_at).getTime();
      if (gap > 360_000) {
        chartData.push({
          timeLabel: '— offline —',
          solar_power: null,
          solar_voltage: null,
          solar_current: null,
          temperature: null,
        });
      }
    }

    chartData.push({
      ...h,
      solar_power: Math.max(0, h.solar_power),
      solar_voltage: Math.max(0, h.solar_voltage),
      solar_current: Math.max(0, h.solar_current),
      timeLabel:
        timeRange === '24h'
          ? format(new Date(h.recorded_at), 'HH:mm')
          : format(new Date(h.recorded_at), 'MMM d, HH:mm'),
    });
  }

  // Header right slot: time range segmented control
  const headerRight = (
    <div className="segmented-control">
      {(['24h', '7d', '30d'] as const).map((range) => (
        <button
          key={range}
          className={timeRange === range ? 'active' : ''}
          onClick={() => setTimeRange(range)}
        >
          {range.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Understand your solar system's performance over time."
        right={headerRight}
      />

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={fetchHistory} />}

      {/* Loading state */}
      {!error && loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ChartCardSkeleton height={280} />
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

      {/* Data */}
      {!error && !loading && (
        <>
          {history.length === 0 ? (
            <EmptyState timeRange={timeRange} />
          ) : (
            <div>
              {/* Solar Power Chart */}
              <ChartCard
                title="Solar Power"
                subtitle="Output power in Watts over time"
                height={260}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis dataKey="timeLabel" {...AXIS_STYLE} dy={8} interval="preserveStartEnd" />
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
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Voltage & Current + Temperature */}
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
                  subtitle="V (left axis) and A (right axis)"
                  height={240}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="timeLabel" {...AXIS_STYLE} dy={8} interval="preserveStartEnd" />
                      <YAxis yAxisId="v" {...AXIS_STYLE} dx={-4} domain={[0, 'auto']} />
                      <YAxis yAxisId="a" orientation="right" {...AXIS_STYLE} dx={4} domain={[0, 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        yAxisId="v"
                        type="monotone"
                        dataKey="solar_voltage"
                        name="Voltage (V)"
                        stroke="var(--accent-blue)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        yAxisId="a"
                        type="monotone"
                        dataKey="solar_current"
                        name="Current (A)"
                        stroke="var(--accent-purple)"
                        strokeWidth={2}
                        dot={false}
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
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="timeLabel" {...AXIS_STYLE} dy={8} interval="preserveStartEnd" />
                      <YAxis {...AXIS_STYLE} dx={-4} domain={['dataMin - 5', 'dataMax + 5']} />
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
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
