import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loginUser, googleAuth, parseApiError } from './apiService';
import './Auth.css';

function Login({ onSuccess, onToggle, onForgotPassword, onResetPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientIdRef = useRef(process.env.REACT_APP_GOOGLE_CLIENT_ID || '');
  const googleButtonRenderedRef = useRef(false);

  const handleGoogleCredential = useCallback(async (response) => {
    setError('');
    setGoogleLoading(true);
    try {
      const credential = response.credential;
      if (!credential) {
        throw new Error('No credential received from Google');
      }
      const res = await googleAuth(credential);
      if (res.access_token) {
        onSuccess();
      }
    } catch (err) {
      setError(parseApiError(err) || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [onSuccess]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser(email.trim(), password);
      if (response.access_token) {
        onSuccess();
      }
    } catch (err) {
      setError(parseApiError(err) || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  useEffect(() => {
    const loadGoogleScript = () => {
      if (typeof window === 'undefined') return;
      if (window.google?.accounts?.id) {
        setGoogleLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      script.onerror = () => console.error('Failed to load Google script');
      document.head.appendChild(script);
    };
    loadGoogleScript();
  }, []);

  useEffect(() => {
    if (!googleLoaded) return;
    if (!window.google?.accounts?.id) return;
    if (!googleClientIdRef.current) {
      console.warn('REACT_APP_GOOGLE_CLIENT_ID is not set');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientIdRef.current,
        callback: handleGoogleCredential,
      });

      const button = document.getElementById('google-signin-button');
      if (button && !googleButtonRenderedRef.current) {
        window.google.accounts.id.renderButton(button, {
          theme: 'outline',
          size: 'large',
          width: '100%',
        });
        googleButtonRenderedRef.current = true;
        setGoogleReady(true);
      }
    } catch (e) {
      console.error('Google init error:', e);
    }
  }, [googleLoaded, handleGoogleCredential]);

  useEffect(() => {
    return () => {
      googleButtonRenderedRef.current = false;
    };
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Login to access your dashboard</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || googleLoading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || googleLoading}
            autoComplete="current-password"
          />
        </div>

        <div className="auth-extra">
          <button type="button" className="forgot-link" onClick={onForgotPassword} disabled={loading}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="auth-button" disabled={loading || googleLoading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {googleClientIdRef.current && (
        <>
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div id="google-signin-button" className="google-button-container">
            {!googleButtonRenderedRef.current && !googleReady && (
              <button type="button" className="google-button" disabled>
                {googleLoaded ? 'Load Google Sign-In' : 'Loading Google...'}
              </button>
            )}
          </div>
        </>
      )}

      <div className="auth-footer">
        Don't have an account?{' '}
        <button type="button" className="toggle-link" onClick={onToggle} disabled={loading || googleLoading}>
          Register here
        </button>
      </div>
    </div>
  );
}

export default Login;
