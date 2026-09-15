import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Supabase appends auth info in the URL hash for implicit grants
      // e.g. #access_token=...&refresh_token=...&type=...
      // or #error=access_denied&error_code=otp_expired&error_description=...
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);
      
      const err = hashParams.get('error') || searchParams.get('error');
      const errDesc = hashParams.get('error_description') || searchParams.get('error_description');
      const type = hashParams.get('type') || searchParams.get('type');

      if (err) {
        if (err === 'access_denied' && hashParams.get('error_code') === 'otp_expired') {
          setError('This confirmation link has expired or was already used.');
          setIsExpired(true);
        } else {
          setError(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : 'An error occurred during authentication.');
        }
        
        // Strip the hash so it doesn't stay in the URL
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      // Check if session was successfully established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError(sessionError.message);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      if (session) {
        // Clear sensitive tokens from the URL
        window.history.replaceState(null, '', window.location.pathname);
        setSuccess(true);
        
        // Redirect to appropriate page based on link type
        setTimeout(() => {
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 2000);
      } else {
        // If there's no session and no explicit error, wait for Supabase to process it
        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_IN' && newSession) {
            window.history.replaceState(null, '', window.location.pathname);
            setSuccess(true);
            setTimeout(() => {
              if (type === 'recovery') {
                navigate('/reset-password', { replace: true });
              } else {
                navigate('/', { replace: true });
              }
            }, 2000);
          }
        });

        // Cleanup listener if component unmounts
        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) throw resendError;
      
      setMessage('Confirmation email sent - check your inbox.');
      setCooldown(60);
      setIsExpired(false);
    } catch (err: any) {
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Please wait a moment before requesting another email.');
        setCooldown(60);
      } else if (err.status === 400 || err.status === 404 || err.message?.toLowerCase().includes('user not found') || err.message?.toLowerCase().includes('invalid')) {
        setError('No account found with this email.');
      } else {
        setError('Something went wrong sending the email. Try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout animate-fade-in">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <img src="/DustZeroIcon.png" alt="DustZero Logo" className="auth-logo" />
          <h2 className="auth-title">DustZero</h2>
          <p className="auth-subtitle">Smart Solar Panel Cleaning System</p>
        </div>
        
        {message && (
          <div className="auth-alert success" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <CheckCircle size={16} className="flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center">
            <XCircle size={48} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-red)', fontSize: '1.25rem', fontWeight: 600 }}>Authentication Error</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{error}</p>
            
            {isExpired && (
              <div style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div className="input-group">
                  <label htmlFor="email">Confirm your email to resend link</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    required
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleResend}
                  disabled={loading || cooldown > 0 || !email}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {loading ? 'Processing...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Resend confirmation email'}
                </button>
              </div>
            )}

            {!isExpired && (
              <button 
                className="btn btn-outline" 
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                Return to Login
              </button>
            )}
          </div>
        ) : success ? (
          <div className="flex flex-col items-center">
            <CheckCircle size={48} color="var(--accent-green)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-green)', fontSize: '1.25rem', fontWeight: 600 }}>Email Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Your account has been successfully verified. Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Verifying...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Please wait while we confirm your email address.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
