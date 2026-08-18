import React, { useState } from 'react';
import { resetPassword, parseApiError } from './apiService';
import './ForgotPassword.css';

function ResetPassword({ token, onToggle }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, password);
      setSuccess('Password reset successful! You can now login.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onToggle();
      }, 2000);
    } catch (err) {
      setError(parseApiError(err) || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-header">
          <h2>Invalid Reset Link</h2>
          <p>The password reset link is invalid or has expired.</p>
        </div>
        <div className="auth-footer">
          <button type="button" className="toggle-link" onClick={onToggle}>
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Create New Password</h2>
        <p>Enter your new password below</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Resetting password...' : 'Reset Password'}
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

export default ResetPassword;