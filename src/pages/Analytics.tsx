import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import type { DeviceHistory, CleaningEvent } from '../types';
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
  Download,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ChartCardSkeleton } from '../components/SkeletonBlock';
import { exportElementToPDF } from '../lib/pdfExport';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = '24h' | '7d' | '30d';
type LoadState = 'loading' | 'success' | 'error';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

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

// ─── Empty State Banner ───────────────────────────────────────────────────────

const EmptyStateBanner: React.FC<{ timeRange: TimeRange; isOffline: boolean }> = ({
  timeRange,
  isOffline,
}) => {
  const rangeLabel =
    timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        marginBottom: '24px',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px dashed var(--border-medium)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Activity size={24} color="var(--text-muted)" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
          No Historical Data
        </h3>
        <p
          className="text-secondary"
          style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}
        >
          {isOffline
            ? `No historical snapshots found for the last ${rangeLabel}. Try switching to a longer time range.`
            : `No measurements have been recorded in the last ${rangeLabel}. Once the device starts sending data, charts will populate below.`}
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
  const { deviceId, isOnline, device } = useDustZero();

  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [cleaningEvents, setCleaningEvents] = useState<CleaningEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [exportingPDF, setExportingPDF] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;

    setLoadState('loading');
    setErrorMessage('');

    const startTime = getRangeStartTime(timeRange);

    try {
      const [historyRes, eventsRes] = await Promise.all([
        supabase
          .from('device_history')
          .select('*')
          .eq('device_id', deviceId)
          .gte('recorded_at', startTime.toISOString())
          .order('recorded_at', { ascending: true }),
        supabase
          .from('cleaning_events')
          .select('*')
          .eq('device_id', deviceId)
          .gte('started_at', startTime.toISOString())
          .order('started_at', { ascending: false })
      ]);

      if (historyRes.error) {
        if (historyRes.error.code === '42P01') {
          setErrorMessage('The device_history table was not found in Supabase.');
        } else {
          setErrorMessage(`Query failed: ${historyRes.error.message || 'Unknown error'}. Check your connection and try again.`);
        }
        setLoadState('error');
        return;
      }

      setHistory((historyRes.data as DeviceHistory[]) || []);
      setCleaningEvents((eventsRes.data as CleaningEvent[]) || []);
      setLoadState('success');
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setErrorMessage('Failed to load historical data. Check your connection and try again.');
      setLoadState('error');
    }
  }, [deviceId, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ['Timestamp', 'Power (W)', 'Voltage (V)', 'Current (A)', 'Temperature (C)', 'Sunlight', 'Rain'];
    const rows = history.map(h => [
      new Date(h.recorded_at).toISOString(),
      h.solar_power,
      h.solar_voltage,
      h.solar_current,
      h.temperature,
      h.sunlight_level || '—',
      h.rain_detected ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dustzero-history-${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!device) return;
    setExportingPDF(true);
    try {
      const title = `Analytics Report for ${device.device_name || device.device_id}`;
      const filename = `dustzero-report-${device.device_name || device.device_id}-${new Date().toISOString().split('T')[0]}.pdf`;
      await exportElementToPDF('pdf-report-container', filename, title);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  const stats = useMemo(() => {
    if (history.length === 0) return {
      totalPower: 0, avgDailyPower: 0, cleaningCount: cleaningEvents.length,
      avgPower: 0, peakPower: 0, avgTemp: 0, peakTemp: 0, avgVoltage: 0, avgCurrent: 0,
      totalSnapshots: 0, startTime: '', endTime: '', downtimeEvents: [], uptimePercentage: 100,
      sunlightDist: { strong: 0, medium: 0, weak: 0, none: 0 }
    };

    const powers = history.map((h) => Math.max(0, h.solar_power));
    const temps = history.map((h) => h.temperature);
    const voltages = history.map((h) => Math.max(0, h.solar_voltage));
    const currents = history.map((h) => Math.max(0, h.solar_current));

    const totalPower = powers.reduce((a, b) => a + b, 0);
    const avgDailyPower = totalPower / 30; // Approx logic as before
    const avgPower = totalPower / powers.length;
    const peakPower = Math.max(...powers);

    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const peakTemp = Math.max(...temps);

    const avgVoltage = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const avgCurrent = currents.reduce((a, b) => a + b, 0) / currents.length;

    const totalSnapshots = history.length;
    const startTime = format(new Date(history[0].recorded_at), 'MMM d, HH:mm');
    const endTime = format(new Date(history[history.length - 1].recorded_at), 'MMM d, HH:mm');

    let downtimeDurationMs = 0;
    const downtimeEvents: { start: string, end: string, durationMin: number }[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const gapMs = new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime();
      if (gapMs > 6 * 60 * 1000) {
        downtimeDurationMs += gapMs;
        downtimeEvents.push({
          start: format(new Date(prev.recorded_at), 'MMM d, HH:mm'),
          end: format(new Date(curr.recorded_at), 'MMM d, HH:mm'),
          durationMin: Math.round(gapMs / 60000)
        });
      }
    }

    const totalPeriodMs = new Date(history[history.length - 1].recorded_at).getTime() - new Date(history[0].recorded_at).getTime();
    const uptimePercentage = totalPeriodMs > 0 ? Math.max(0, 100 - (downtimeDurationMs / totalPeriodMs) * 100) : 100;

    let strong = 0, medium = 0, weak = 0, none = 0;
    history.forEach(h => {
      if (h.sunlight_level === 'STRONG') strong++;
      else if (h.sunlight_level === 'MEDIUM') medium++;
      else if (h.sunlight_level === 'WEAK') weak++;
      else none++;
    });

    const sunlightDist = {
      strong: (strong / totalSnapshots) * 100,
      medium: (medium / totalSnapshots) * 100,
      weak: (weak / totalSnapshots) * 100,
      none: (none / totalSnapshots) * 100,
    };

    const cleaningCount = cleaningEvents.length;
    
    return { 
      totalPower, avgDailyPower, cleaningCount,
      avgPower, peakPower, avgTemp, peakTemp, avgVoltage, avgCurrent,
      totalSnapshots, startTime, endTime, downtimeEvents, uptimePercentage,
      sunlightDist
    };
  }, [history, cleaningEvents]);

  const chartData = useMemo(() => {
    const result: any[] = [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (i > 0) {
        const prev = history[i - 1];
        const gapMs = new Date(h.recorded_at).getTime() - new Date(prev.recorded_at).getTime();
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
        solar_power: Math.max(0, h.solar_power),
        solar_voltage: Math.max(0, h.solar_voltage),
        solar_current: Math.max(0, h.solar_current),
        timeLabel: formatXLabel(h.recorded_at, timeRange),
      });
    }
    return result;
  }, [history, timeRange]);

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

  const lastSeen = device?.updated_at ? formatDistanceToNow(new Date(device.updated_at), { addSuffix: true }) : null;

  const headerRight = (
    <div className="flex items-center gap-4">
      <button 
        className="btn btn-primary" 
        style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
        onClick={handleExportPDF} 
        disabled={exportingPDF || history.length === 0} 
        title="Export data to PDF"
      >
        <FileText size={14} style={{ marginRight: '6px' }} />
        {exportingPDF ? 'Generating...' : 'PDF Report'}
      </button>
      <button 
        className="btn btn-outline" 
        style={{ padding: '6px 12px', fontSize: '0.85rem' }} 
        onClick={exportToCSV} 
        disabled={history.length === 0} 
        title="Export data to CSV"
      >
        <Download size={14} style={{ marginRight: '6px' }} />
        CSV Export
      </button>
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
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Historical performance and sensor data — independent of current device status."
        right={headerRight}
      />

      {/* ─── PDF Report Wrapper (Hidden in UI, captured for PDF) ─── */}
      <div 
        id="pdf-report-container" 
        style={{ 
          display: 'none', 
          width: '800px', 
          padding: '30px', 
          backgroundColor: '#FAFAFA',
          color: '#111827',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#111827' }}>Overview Summary</h2>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>Data coverage: {stats.startTime} &rarr; {stats.endTime} ({stats.totalSnapshots} snapshots)</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
           <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Avg / Peak Power</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.avgPower.toFixed(2)} / {stats.peakPower.toFixed(2)} W</div>
           </div>
           <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Avg / Peak Temp</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.avgTemp.toFixed(1)} / {stats.peakTemp.toFixed(1)} &deg;C</div>
           </div>
           <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Avg Voltage / Current</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.avgVoltage.toFixed(2)}V / {stats.avgCurrent.toFixed(2)}A</div>
           </div>
           <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Cleanings</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.cleaningCount} cycles</div>
           </div>
        </div>

        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>Uptime & Reliability</h3>
          <div style={{ fontSize: '14px', marginBottom: '16px' }}>
            Device was online and reporting <strong>{stats.uptimePercentage.toFixed(1)}%</strong> of the selected period.
          </div>
          {stats.downtimeEvents.length > 0 ? (
            <div style={{ fontSize: '13px', color: '#4B5563' }}>
              <strong>Detected Offline Windows (&gt;6 min gap):</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                {stats.downtimeEvents.slice(0, 5).map((e, i) => (
                  <li key={i}>{e.start} to {e.end} ({e.durationMin} minutes)</li>
                ))}
                {stats.downtimeEvents.length > 5 && <li>...and {stats.downtimeEvents.length - 5} more</li>}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#059669' }}>No offline windows detected.</div>
          )}
        </div>
        
        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Power Output (W)</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Area isAnimationActive={false} type="monotone" dataKey="solar_power" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} dot={{ r: 1, fill: "#F59E0B" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Voltage (V) & Current (A)</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#2563EB" tick={{ fill: '#2563EB', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#059669" tick={{ fill: '#059669', fontSize: 12 }} />
                <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="solar_voltage" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="solar_current" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '30px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Temperature (&deg;C)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis stroke="#E11D48" tick={{ fill: '#E11D48', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Line isAnimationActive={false} type="monotone" dataKey="temperature" stroke="#E11D48" strokeWidth={2} dot={{ r: 1 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: '30px', display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Sunlight Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Strong</span> <span>{stats.sunlightDist.strong.toFixed(1)}%</span></div>
               <div style={{ width: '100%', height: '6px', backgroundColor: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${stats.sunlightDist.strong}%`, height: '100%', backgroundColor: '#F59E0B' }} /></div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Medium</span> <span>{stats.sunlightDist.medium.toFixed(1)}%</span></div>
               <div style={{ width: '100%', height: '6px', backgroundColor: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${stats.sunlightDist.medium}%`, height: '100%', backgroundColor: '#FBBF24' }} /></div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Weak</span> <span>{stats.sunlightDist.weak.toFixed(1)}%</span></div>
               <div style={{ width: '100%', height: '6px', backgroundColor: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${stats.sunlightDist.weak}%`, height: '100%', backgroundColor: '#9CA3AF' }} /></div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>None (Night/Covered)</span> <span>{stats.sunlightDist.none.toFixed(1)}%</span></div>
               <div style={{ width: '100%', height: '6px', backgroundColor: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${stats.sunlightDist.none}%`, height: '100%', backgroundColor: '#4B5563' }} /></div>
            </div>
          </div>
          
          <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Cleaning Cycles</h3>
            {cleaningEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflow: 'hidden' }}>
                {cleaningEvents.slice(0, 5).map((ev) => {
                  const efficiency = ev.power_before > 0 
                    ? ((ev.power_after - ev.power_before) / ev.power_before) * 100 
                    : 0;
                  return (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid #E5E7EB' }}>
                      <div>{format(new Date(ev.started_at), 'MMM d, HH:mm')}</div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#6B7280' }}>{ev.power_before.toFixed(2)}W &rarr; {ev.power_after.toFixed(2)}W</span>
                        <div style={{ color: efficiency > 0 ? '#059669' : '#6B7280', fontWeight: 'bold' }}>
                          {efficiency > 0 ? '+' : ''}{efficiency.toFixed(1)}% efficiency
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cleaningEvents.length > 5 && <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>+ {cleaningEvents.length - 5} more cycles</div>}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                No cleaning cycles recorded in this period.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────── */}

      {!isOnline && <OfflineNotice lastSeen={lastSeen} />}

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

      {loadState === 'error' && (
        <ErrorState message={errorMessage} onRetry={fetchHistory} />
      )}

      {loadState === 'success' && (
        <div>
          {history.length === 0 && <EmptyStateBanner timeRange={timeRange} isOffline={!isOnline} />}
          
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

          {/* Cleaning Effectiveness */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', marginBottom: '16px' }}>Cleaning Effectiveness</h3>
            {cleaningEvents.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No cleaning cycles recorded in this timeframe.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {cleaningEvents.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between" style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Cycle at {format(new Date(ev.started_at), 'MMM d, h:mm a')}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Trigger: <strong>{ev.trigger}</strong> • Sunlight: <strong>{ev.sunlight_level || 'Unknown'}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: ev.power_delta > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {ev.power_delta > 0 ? '+' : ''}{ev.power_delta.toFixed(3)} W
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {ev.power_before.toFixed(3)}W → {ev.power_after.toFixed(3)}W
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                  dot={history.length <= 60 && history.length > 0 ? { fill: 'var(--accent-amber)', r: 3, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: 'var(--accent-amber)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
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
                    dot={history.length <= 60 && history.length > 0 ? { fill: 'var(--accent-blue)', r: 3, strokeWidth: 0 } : false}
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
                    dot={history.length <= 60 && history.length > 0 ? { fill: 'var(--accent-purple)', r: 3, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: 'var(--accent-purple)' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

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
                    dot={history.length <= 60 && history.length > 0 ? { fill: 'var(--accent-red)', r: 3, strokeWidth: 0 } : false}
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
