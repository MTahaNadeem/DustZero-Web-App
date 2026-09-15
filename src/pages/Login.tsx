import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showUnconfirmedResend, setShowUnconfirmedResend] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowUnconfirmedResend(false);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email for the confirmation link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/');
      }
    } catch (err: any) {
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Please wait a moment before requesting another email.');
        if (isSignUp) setCooldown(60);
      } else if (err.message === 'Email not confirmed') {
        setError('Your email has not been confirmed yet.');
        setShowUnconfirmedResend(true);
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage('Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address to resend confirmation.');
      return;
    }
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setMessage('Confirmation email sent — check your inbox.');
      setShowUnconfirmedResend(false);
      setCooldown(60);
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
      <div className="login-card">
        <div className="login-header">
          <img src="/DustZeroIcon.png" alt="DustZero Logo" className="login-logo" />
          <h2>DustZero</h2>
          <p>Smart Solar Panel Cleaning System</p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {error && (
            <div className="login-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="login-alert success">
              <span>{message}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn" 
            disabled={loading || (isSignUp && cooldown > 0)}
          >
            {loading ? 'Processing...' : isSignUp ? (cooldown > 0 ? `Wait ${cooldown}s` : 'Sign Up') : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          {showUnconfirmedResend && !isSignUp && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Didn't get the email?</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleResendConfirmation}
                disabled={loading || cooldown > 0}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : 'Resend confirmation'}
              </button>
            </div>
          )}

          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
          
          {!isSignUp && (
            <>
              <button
                type="button"
                className="text-btn"
                onClick={handleResetPassword}
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                Forgot Password?
              </button>
              {!showUnconfirmedResend && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={handleResendConfirmation}
                  disabled={loading || cooldown > 0}
                  style={{ marginTop: '0.5rem' }}
                >
                  {cooldown > 0 ? `Wait ${cooldown}s to Resend` : 'Resend Confirmation Email'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
