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
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Supabase appends error info in the URL hash for implicit grants
      // e.g. #error=access_denied&error_code=otp_expired&error_description=...
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      const err = hashParams.get('error') || searchParams.get('error');
      const errDesc = hashParams.get('error_description') || searchParams.get('error_description');

      if (err) {
        if (err === 'access_denied' && hashParams.get('error_code') === 'otp_expired') {
          setError('This confirmation link has expired.');
          setIsExpired(true);
        } else {
          setError(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : 'An error occurred during authentication.');
        }
        return;
      }

      // Check if session was successfully established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (session) {
        setSuccess(true);
        // Redirect after a short delay so user sees the success message
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        // If there's no session and no explicit error, we might just be waiting for 
        // Supabase to process the URL. We'll listen for auth state changes.
        const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_IN' && newSession) {
            setSuccess(true);
            setTimeout(() => {
              navigate('/', { replace: true });
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
      
      setMessage('Confirmation email sent — check your inbox.');
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
    <div className="login-container animate-fade-in">
      <div className="login-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <img src="/DustZeroIcon.png" alt="DustZero Logo" className="login-logo" style={{ margin: '0 auto 1.5rem' }} />
        
        {message && (
          <div className="login-alert success" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <span>{message}</span>
          </div>
        )}

        {error ? (
          <>
            <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '1rem', color: '#ef4444' }}>Authentication Error</h2>
            <p style={{ marginBottom: '1.5rem' }}>{error}</p>
            
            {isExpired && (
              <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Confirm your email to resend link</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-with-icon"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '1rem' }}
                  required
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleResend}
                  disabled={loading || cooldown > 0 || !email}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Processing...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Resend confirmation email'}
                </button>
              </div>
            )}

            {!isExpired && (
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                Return to Login
              </button>
            )}
          </>
        ) : success ? (
          <>
            <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '1rem', color: '#10b981' }}>Email Confirmed!</h2>
            <p>Your account has been successfully verified. Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '1rem' }}>Verifying...</h2>
            <p>Please wait while we confirm your email address.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
