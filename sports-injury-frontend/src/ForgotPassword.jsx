import React, { useState } from 'react';
import { forgotPassword, parseApiError } from './apiService';
import './ForgotPassword.css';

function ForgotPassword({ onToggle, onResetPassword }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword(email.trim());
      setSuccess('If an account with that email exists, a password reset link has been sent.');
      setEmail('');
      if (res.token && onResetPassword) {
        setTimeout(() => onResetPassword(res.token), 1500);
      }
    } catch (err) {
      setError(parseApiError(err) || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Reset Password</h2>
        <p>Enter your email to receive a password reset link</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Sending reset link...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-footer">
        Remember your password?{' '}
        <button type="button" className="toggle-link" onClick={onToggle} disabled={loading}>
          Login here
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;