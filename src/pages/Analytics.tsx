import { useEffect, useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import type { DeviceHistory } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

const Analytics = () => {
  const { deviceId } = useDustZero();
  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
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
        
        setHistory(data as DeviceHistory[] || []);
      } catch (err: any) {
        console.error("Error fetching history:", err);
        // Supabase returns 42P01 if table doesn't exist
        if (err.code === '42P01') {
          setError("Historical data table not found. Please refer to the README to set up the device_history table and Edge Function.");
        } else {
          setError("Failed to load historical data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      fetchHistory();
    }
  }, [deviceId, timeRange]);

  const chartData: any[] = [];
  
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    
    if (i > 0) {
      const prev = history[i - 1];
      const prevTime = new Date(prev.recorded_at).getTime();
      const currTime = new Date(h.recorded_at).getTime();
      
      // If gap is more than 6 minutes (360000 ms), insert a gap point
      if (currTime - prevTime > 360000) {
        chartData.push({
          timeLabel: 'Offline',
          solar_power: null,
          solar_voltage: null,
          solar_current: null,
          temperature: null,
        });
      }
    }
    
    chartData.push({
      ...h,
      timeLabel: timeRange === '24h' 
        ? format(new Date(h.recorded_at), 'HH:mm') 
        : format(new Date(h.recorded_at), 'MMM dd, HH:mm')
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {entry.name}: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.value}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>Analytics</h2>
        
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setTimeRange('24h')}
            style={{ 
              background: timeRange === '24h' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '24h' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              transition: 'all var(--transition-speed)'
            }}
          >
            24H
          </button>
          <button 
            onClick={() => setTimeRange('7d')}
            style={{ 
              background: timeRange === '7d' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '7d' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              transition: 'all var(--transition-speed)'
            }}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeRange('30d')}
            style={{ 
              background: timeRange === '30d' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '30d' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              transition: 'all var(--transition-speed)'
            }}
          >
            30D
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--accent-amber-bg)', borderColor: 'rgba(245, 158, 11, 0.2)', borderLeft: '4px solid var(--accent-amber)', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--accent-amber)', margin: 0, fontSize: '1.05rem' }}>Data Unavailable</h3>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '8px' }}>{error}</p>
        </div>
      )}

      {!error && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          Loading historical data...
        </div>
      )}

      {!error && !loading && history.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          No data available for this time range.
        </div>
      )}

      {!error && !loading && history.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: '24px', height: '320px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>Solar Power (W)</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="solar_power" name="Power" stroke="var(--accent-amber)" strokeWidth={2} fillOpacity={1} fill="url(#colorPower)" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>Voltage & Current</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 'auto']} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dx={10} domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line yAxisId="left" type="monotone" dataKey="solar_voltage" name="Voltage (V)" stroke="var(--accent-blue)" dot={false} strokeWidth={2} connectNulls={false} />
                    <Line yAxisId="right" type="monotone" dataKey="solar_current" name="Current (A)" stroke="var(--accent-purple)" dot={false} strokeWidth={2} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>Temperature (°C)</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="temperature" name="Temp" stroke="var(--accent-red)" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
