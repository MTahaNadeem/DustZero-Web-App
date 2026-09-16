import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDustZero } from '../contexts/DustZeroContext';
import { Loader2, Zap, ArrowRight, CheckCircle2, MapPin, Tag } from 'lucide-react';
import '../auth.css'; // Reuse auth styles for the centered card layout

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshDevices, setDeviceId } = useDustZero();
  
  const [step, setStep] = useState(1);
  
  // Step 2 state
  const [tempId, setTempId] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  
  // Step 3 state
  const [deviceName, setDeviceName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempId.trim() || claiming) return;

    setClaiming(true);
    setClaimError('');

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('device_id, user_id')
        .eq('device_id', tempId.trim())
        .single();

      if (error && error.code !== 'PGRST116') {
         setClaimError("Couldn't reach the server. Check your connection.");
      } else if (!data) {
        // Device doesn't exist, insert it
        const { error: insertError } = await supabase.from('devices').insert([{
          device_id: tempId.trim(),
          user_id: user?.id,
          connected: false,
          ldr1: 0, ldr2: 0, temperature: 0, solar_voltage: 0, solar_current: 0, solar_power: 0,
          rain_detected: false, sunlight_level: 'WEAK',
          cleaning_state: 'IDLE',
        }]);

        if (insertError) {
           setClaimError(`Cannot claim device '${tempId.trim()}'. It may be owned by another user.`);
        } else {
           setDeviceId(tempId.trim());
           setStep(3);
        }
      } else {
        if (data.user_id === null) {
          // Device is unclaimed, claim it
          const { error: updateError } = await supabase
            .from('devices')
            .update({ user_id: user?.id })
            .eq('device_id', tempId.trim());

          if (updateError) {
            setClaimError(`Cannot claim device '${tempId.trim()}'. It may be owned by another user.`);
          } else {
            setDeviceId(tempId.trim());
            setStep(3);
          }
        } else if (data.user_id === user?.id) {
          // Already owned by us
          setDeviceId(tempId.trim());
          setStep(3);
        } else {
          setClaimError(`Device '${tempId.trim()}' is already claimed by another user.`);
        }
      }
    } catch {
      setClaimError("An unexpected error occurred.");
    } finally {
      setClaiming(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation not supported.');
      return;
    }
    setLocationMessage('Locating...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setLocationMessage('Location found.');
      },
      () => {
        setLocationMessage('Failed to get location. Please allow access.');
      }
    );
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    
    await supabase.from('devices').update({
      device_name: deviceName.trim() || null,
      latitude: isNaN(parsedLat) ? null : parsedLat,
      longitude: isNaN(parsedLon) ? null : parsedLon
    }).eq('device_id', tempId.trim());
    
    await refreshDevices();
    setSavingDetails(false);
    setStep(4);
  };

  const finishOnboarding = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-container animate-fade-in" style={{ padding: '20px' }}>
      <div className="auth-card" style={{ maxWidth: '480px', width: '100%' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ height: '4px', flex: 1, borderRadius: '2px', backgroundColor: s <= step ? 'var(--accent-green)' : 'var(--bg-elevated)', transition: 'background-color 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
              <img src="/DustZeroIcon.png" alt="DustZero" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Welcome to DustZero</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
              DustZero is your smart automatic solar panel cleaning system. This dashboard will help you monitor your panel's efficiency, weather conditions, and control the cleaning mechanism.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Claim Your Device</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
              Enter the Device ID configured in your ESP32 firmware to link the physical hardware to your account.
            </p>
            <form onSubmit={handleClaim}>
              <div className="form-group">
                <label className="form-label" htmlFor="deviceId">Device ID</label>
                <div className="input-wrapper">
                  <Zap className="input-icon" size={18} />
                  <input
                    id="deviceId"
                    type="text"
                    className={`auth-input ${claimError ? 'error' : ''}`}
                    placeholder="e.g. dustzero-001"
                    value={tempId}
                    onChange={(e) => {
                      setTempId(e.target.value);
                      setClaimError('');
                    }}
                    disabled={claiming}
                    required
                  />
                </div>
                {claimError && <div className="form-error">{claimError}</div>}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={claiming || !tempId.trim()}>
                {claiming ? <Loader2 size={16} className="animate-spin" /> : 'Claim Device'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Personalize Device</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
              Give your device a friendly name and set its location to receive accurate weather forecasts.
            </p>
            <form onSubmit={handleSaveDetails}>
              <div className="form-group">
                <label className="form-label">Friendly Name (Optional)</label>
                <div className="input-wrapper">
                  <Tag className="input-icon" size={18} />
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Roof Panel"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Location (For Weather)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input type="number" step="any" placeholder="Latitude" className="auth-input" value={lat} onChange={e => setLat(e.target.value)} />
                  <input type="number" step="any" placeholder="Longitude" className="auth-input" value={lon} onChange={e => setLon(e.target.value)} />
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleGeolocation} style={{ width: '100%' }}>
                  <MapPin size={14} /> Use My Current Location
                </button>
                {locationMessage && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>{locationMessage}</div>}
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} disabled={savingDetails}>
                {savingDetails ? <Loader2 size={16} className="animate-spin" /> : 'Continue'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: '8px' }} onClick={() => setStep(4)}>
                Skip for now
              </button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', border: '1px solid var(--accent-green-border)' }}>
              <CheckCircle2 size={32} color="var(--accent-green)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>You're All Set!</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
              Your DustZero dashboard is ready. You can always update your settings or add more devices later from the Settings menu.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={finishOnboarding}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
