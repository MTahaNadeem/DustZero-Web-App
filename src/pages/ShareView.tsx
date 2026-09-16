import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Device } from '../types';
import { formatDistanceToNow } from 'date-fns';
import {
  Zap,
  Thermometer,
  Sun,
  Gauge,
  Activity
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';

const OFFLINE_TIMEOUT_MS = 15000;

export const ShareView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchDevice = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('public_slug', slug)
        .eq('is_public', true)
        .single();
        
      if (error || !data) {
        setError('Shared device not found or is no longer public.');
        setLoading(false);
        return;
      }
      
      setDevice(data as Device);
      setLoading(false);
    };
    
    fetchDevice();
  }, [slug]);

  useEffect(() => {
    if (!device) return;

    const subscription = supabase
      .channel(`public_device_updates_${device.device_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `device_id=eq.${device.device_id}`
        },
        (payload) => {
          const updated = payload.new as Device;
          if (!updated.is_public) {
            setError('This device is no longer public.');
            setDevice(null);
          } else {
            setDevice(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [device?.device_id]);

  useEffect(() => {
    if (!device) return;

    const checkOnline = () => {
      if (!device.connected) {
        setIsOnline(false);
        return;
      }
      
      const lastUpdate = new Date(device.updated_at).getTime();
      const now = new Date().getTime();
      setIsOnline((now - lastUpdate) < OFFLINE_TIMEOUT_MS);
    };

    checkOnline();
    const interval = setInterval(checkOnline, 2000);
    return () => clearInterval(interval);
  }, [device]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <Activity size={32} className="animate-spin" color="var(--accent-green)" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', gap: '16px' }}>
        <img src="/DustZeroIcon.png" alt="DustZero" style={{ width: '64px', height: '64px', borderRadius: '16px', opacity: 0.5 }} />
        <h2 style={{ margin: 0 }}>Link Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <Link to="/" className="btn btn-primary">Go to DustZero</Link>
      </div>
    );
  }

  const lastUpdate = device.updated_at
    ? formatDistanceToNow(new Date(device.updated_at), { addSuffix: true })
    : null;

  const phaseColor = 'var(--accent-green)'; // Simplification for read-only

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Read Only Header */}
      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-3">
          <img src="/DustZeroIcon.png" alt="DustZero" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>DustZero — Read Only View</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monitoring {device.device_name || device.device_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ justifyContent: 'flex-end' }}>
          {isOnline && lastUpdate && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {lastUpdate.replace('about ', '')}
            </span>
          )}
          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Power Card */}
          <div
            className="card"
            style={{
              background: isOnline
                ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.04) 100%)'
                : 'var(--bg-card)',
              padding: '28px 32px',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
              <div
                style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  backgroundColor: isOnline ? 'var(--accent-amber-bg)' : 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid', borderColor: isOnline ? 'var(--accent-amber-border)' : 'var(--border-subtle)',
                }}
              >
                <Zap size={20} color={isOnline ? 'var(--accent-amber)' : 'var(--text-muted)'} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Solar Power
              </div>
            </div>
            <div className="flex items-baseline gap-2" style={{ marginBottom: '8px' }}>
              {!isOnline ? (
                <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>—</span>
              ) : (
                <>
                  <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Math.max(0, device.solar_power).toFixed(3)}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>W</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <MetricCard
            title="Voltage"
            value={Math.max(0, device.solar_voltage).toFixed(2)}
            unit="V"
            icon={<Activity size={18} />}
            isOffline={!isOnline}
            accentColor="blue"
            subtitle="Panel voltage"
          />
          <MetricCard
            title="Current"
            value={Math.max(0, device.solar_current).toFixed(3)}
            unit="A"
            icon={<Zap size={18} />}
            isOffline={!isOnline}
            accentColor="purple"
            subtitle="Output current"
          />
          <MetricCard
            title="Temperature"
            value={device.temperature.toFixed(1)}
            unit="°C"
            icon={<Thermometer size={18} />}
            isOffline={!isOnline}
            accentColor="red"
            subtitle="Ambient temperature"
          />
          <MetricCard
            title="LDR Average"
            value={Math.round((device.ldr1 + device.ldr2) / 2).toString()}
            unit=""
            icon={<Sun size={18} />}
            isOffline={!isOnline}
            accentColor="amber"
            subtitle="Light sensor avg"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
           {/* Environment Card */}
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--accent-amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-amber-border)' }}>
                <Sun size={16} color="var(--accent-amber)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Environment</h3>
            </div>
            
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sunlight</span>
                {!isOnline ? <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span> : <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{device.sunlight_level}</span>}
              </div>
            </div>

            <div style={{ padding: '12px 0' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Rain</span>
                {!isOnline ? <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span> : <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', backgroundColor: device.rain_detected ? 'var(--accent-blue-bg)' : 'var(--accent-green-bg)', color: device.rain_detected ? 'var(--accent-blue)' : 'var(--accent-green)', border: `1px solid ${device.rain_detected ? 'var(--accent-blue-border)' : 'var(--accent-green-border)'}` }}>{device.rain_detected ? 'Detected' : 'Clear'}</span>}
              </div>
            </div>
          </div>

          {/* Cleaning Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-blue-border)' }}>
                <Gauge size={16} color="var(--accent-blue)" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Cleaning System</h3>
            </div>

            <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0, borderRadius: '50%', background: isOnline ? phaseColor : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} color={isOnline ? phaseColor : 'var(--text-muted)'} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Current Phase</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isOnline ? phaseColor : 'var(--text-muted)' }}>{!isOnline ? '—' : device.cleaning_state}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
