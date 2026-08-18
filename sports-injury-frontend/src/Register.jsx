import React, { useState } from 'react';
import { registerUser, parseApiError } from './apiService';
import './Auth.css';

function Register({ onSuccess, onToggle }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await registerUser(formData.full_name.trim(), formData.email.trim(), formData.password);
      onToggle();
    } catch (err) {
      setError(parseApiError(err) || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Create Account</h2>
        <p>Join Sports Injury Detection</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="full_name">Full Name</label>
          <input
            id="full_name"
            type="text"
            placeholder="John Athlete"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            disabled={loading}
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Create a password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <button type="button" className="toggle-link" onClick={onToggle} disabled={loading}>
          Login here
        </button>
      </div>
    </div>
  );
}

export default Register;
