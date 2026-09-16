import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  
  // Controls if we show the "Didn't get the email?" section
  const [showResendAction, setShowResendAction] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we routed here with a success message (e.g., from ResetPassword)
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clean up the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 && isSignUp) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setShowResendAction(false);

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
        setMessage('Check your inbox to confirm your email.');
        // Show the resend action for post-signup
        setShowResendAction(true);
      } else {
        if (!rememberMe) {
          sessionStorage.setItem('dustzero_no_persist', 'true');
        } else {
          sessionStorage.removeItem('dustzero_no_persist');
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/');
      }
    } catch (err: any) {
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
        setError('Please wait a moment before trying again.');
        if (isSignUp) setCooldown(60);
      } else if (err.message === 'Email not confirmed' || err.message?.toLowerCase().includes('email not confirmed')) {
        setError('Your email has not been confirmed yet.');
        setShowResendAction(true);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setMessage('Password reset link sent to your email.');
    } catch (err: any) {
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
        setError('Please wait a moment before requesting another reset email.');
      } else {
        setError(err.message || 'Something went wrong.');
      }
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
    <div className="auth-layout animate-fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/DustZeroIcon.png" alt="DustZero Logo" className="auth-logo" />
          <h2 className="auth-title">DustZero</h2>
          <p className="auth-subtitle">Smart Solar Panel Cleaning System</p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="auth-alert success">
              <CheckCircle size={16} className="flex-shrink-0" />
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '-0.5rem', marginBottom: '1.25rem', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer', margin: 0, accentColor: 'var(--primary-color, #3b82f6)' }}
              />
              <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                Remember Me
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '4px' }}
            disabled={loading || (isSignUp && cooldown > 0)}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          {showResendAction && (
            <div className="resend-action-box">
              <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Didn't get the email?</p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResendConfirmation}
                disabled={loading || cooldown > 0}
                style={{ width: '100%' }}
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : 'Resend confirmation'}
              </button>
            </div>
          )}

          <div className="auth-links-row">
            <button
              type="button"
              className="auth-link accent"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
                setShowResendAction(false);
              }}
            >
              {isSignUp ? 'Sign In Instead' : 'Need an account?'}
            </button>
            
            {!isSignUp && (
              <button
                type="button"
                className="auth-link"
                onClick={handleResetPassword}
                disabled={loading}
              >
                Forgot Password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
