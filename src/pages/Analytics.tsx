import React, { useEffect, useState } from 'react';
import { useDustZero } from '../contexts/DustZeroContext';
import { supabase } from '../lib/supabase';
import { DeviceHistory } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

const Analytics = () => {
  const { deviceId, isOnline } = useDustZero();
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

  const chartData = history.map(h => ({
    ...h,
    timeLabel: timeRange === '24h' 
      ? format(new Date(h.recorded_at), 'HH:mm') 
      : format(new Date(h.recorded_at), 'MMM dd, HH:mm')
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '12px', border: '1px solid var(--bg-card)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: 0, color: entry.color, fontSize: '0.85rem' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Analytics</h2>
        
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setTimeRange('24h')}
            style={{ 
              background: timeRange === '24h' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '24h' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 
            }}
          >
            24H
          </button>
          <button 
            onClick={() => setTimeRange('7d')}
            style={{ 
              background: timeRange === '7d' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '7d' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 
            }}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeRange('30d')}
            style={{ 
              background: timeRange === '30d' ? 'var(--bg-elevated)' : 'transparent',
              color: timeRange === '30d' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 
            }}
          >
            30D
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber)', padding: '16px', borderRadius: 'var(--border-radius)', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--accent-amber)', margin: 0, fontSize: '1rem' }}>Data Unavailable</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>{error}</p>
        </div>
      )}

      {!error && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading historical data...
        </div>
      )}

      {!error && !loading && history.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          No data available for this time range.
        </div>
      )}

      {!error && !loading && history.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: '24px', height: '300px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Solar Power (W)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-elevated)" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="solar_power" name="Power" stroke="var(--accent-amber)" fillOpacity={1} fill="url(#colorPower)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ height: '250px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Voltage & Current</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-elevated)" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="solar_voltage" name="Voltage (V)" stroke="var(--accent-blue)" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="solar_current" name="Current (A)" stroke="var(--accent-green)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="card" style={{ height: '250px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Temperature (°C)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-elevated)" vertical={false} />
                  <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="temperature" name="Temp" stroke="var(--accent-red)" fillOpacity={1} fill="url(#colorTemp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
