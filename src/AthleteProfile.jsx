// ============================================================================
// ATHLETE PROFILE COMPONENT
// ============================================================================
// This component shows a form where athletes can enter their profile info
// Sport type, position, age, height, weight, injury history, training load
// ============================================================================

import React, { useState, useEffect } from 'react';
import { createAthleteProfile, getAthleteProfile } from './apiService';
import './AthleteProfile.css';

/**
 * AthleteProfile Component
 * 
 * What it does:
 * 1. Shows form to enter athlete info
 * 2. Saves athlete profile to backend
 * 3. Loads existing profile if user already has one
 */
function AthleteProfile({ onSuccess }) {
  // ========================================================================
  // STATE VARIABLES
  // ========================================================================
  
  const [formData, setFormData] = useState({
    sport_type: '',
    position: '',
    age: '',
    height: '',
    weight: '',
    injury_history: '',
    training_load: 'moderate'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(true);

  // ========================================================================
  // LOAD EXISTING PROFILE ON MOUNT
  // ========================================================================
  
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getAthleteProfile();
      if (profile) {
        setFormData(profile);
        setEditMode(false); // If profile exists, show view mode first
      }
    } catch (err) {
      // No profile yet, show form
      setEditMode(true);
    }
  };

  // ========================================================================
  // HANDLE INPUT CHANGES
  // ========================================================================
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ========================================================================
  // HANDLE FORM SUBMISSION
  // ========================================================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate inputs
    if (!formData.sport_type || !formData.position || !formData.age || !formData.height || !formData.weight) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate age
    if (formData.age < 13 || formData.age > 100) {
      setError('Please enter valid age (13-100)');
      return;
    }

    // Validate height and weight
    if (formData.height < 100 || formData.height > 250) {
      setError('Please enter valid height in cm (100-250)');
      return;
    }

    if (formData.weight < 30 || formData.weight > 200) {
      setError('Please enter valid weight in kg (30-200)');
      return;
    }

    try {
      setLoading(true);

      // Send to backend
      const response = await createAthleteProfile(formData);

      setSuccess('Profile saved successfully!');
      setEditMode(false);

      // Call parent callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  // VIEW MODE (Profile saved)
  if (!editMode) {
    return (
      <div className="athlete-profile-container">
        <div className="profile-header">
          <h2>Athlete Profile</h2>
          <button onClick={() => setEditMode(true)} className="edit-btn">Edit Profile</button>
        </div>

        <div className="profile-display">
          <div className="profile-row">
            <label>Sport Type:</label>
            <span>{formData.sport_type}</span>
          </div>
          <div className="profile-row">
            <label>Position:</label>
            <span>{formData.position}</span>
          </div>
          <div className="profile-row">
            <label>Age:</label>
            <span>{formData.age} years</span>
          </div>
          <div className="profile-row">
            <label>Height:</label>
            <span>{formData.height} cm</span>
          </div>
          <div className="profile-row">
            <label>Weight:</label>
            <span>{formData.weight} kg</span>
          </div>
          <div className="profile-row">
            <label>Injury History:</label>
            <span>{formData.injury_history || 'None'}</span>
          </div>
          <div className="profile-row">
            <label>Training Load:</label>
            <span>{formData.training_load}</span>
          </div>
        </div>

        <p className="profile-info">✅ Your profile is saved and will be used for injury risk assessment.</p>
      </div>
    );
  }

  // EDIT MODE (Form)
  return (
    <div className="athlete-profile-container">
      <div className="profile-header">
        <h2>Create/Edit Athlete Profile</h2>
        <p>Enter your athletic information for injury risk assessment</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        
        {/* Sport Type */}
        <div className="form-group">
          <label htmlFor="sport_type">Sport Type *</label>
          <select
            id="sport_type"
            name="sport_type"
            value={formData.sport_type}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">Select a sport</option>
            <option value="Basketball">Basketball</option>
            <option value="Football">Football</option>
            <option value="Cricket">Cricket</option>
            <option value="Tennis">Tennis</option>
            <option value="Running">Running</option>
            <option value="Volleyball">Volleyball</option>
            <option value="Badminton">Badminton</option>
            <option value="Swimming">Swimming</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Position */}
        <div className="form-group">
          <label htmlFor="position">Position *</label>
          <input
            id="position"
            type="text"
            name="position"
            placeholder="e.g., Guard, Forward, Batsman, Bowler"
            value={formData.position}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        {/* Age */}
        <div className="form-group">
          <label htmlFor="age">Age (years) *</label>
          <input
            id="age"
            type="number"
            name="age"
            placeholder="e.g., 25"
            value={formData.age}
            onChange={handleChange}
            min="13"
            max="100"
            required
            disabled={loading}
          />
        </div>

        {/* Height */}
        <div className="form-group">
          <label htmlFor="height">Height (cm) *</label>
          <input
            id="height"
            type="number"
            name="height"
            placeholder="e.g., 180"
            value={formData.height}
            onChange={handleChange}
            min="100"
            max="250"
            required
            disabled={loading}
          />
        </div>

        {/* Weight */}
        <div className="form-group">
          <label htmlFor="weight">Weight (kg) *</label>
          <input
            id="weight"
            type="number"
            name="weight"
            placeholder="e.g., 75"
            value={formData.weight}
            onChange={handleChange}
            min="30"
            max="200"
            required
            disabled={loading}
          />
        </div>

        {/* Injury History */}
        <div className="form-group">
          <label htmlFor="injury_history">Previous Injuries</label>
          <textarea
            id="injury_history"
            name="injury_history"
            placeholder="e.g., Right ankle sprain in 2023, Knee injury"
            value={formData.injury_history}
            onChange={handleChange}
            rows="3"
            disabled={loading}
          />
        </div>

        {/* Training Load */}
        <div className="form-group">
          <label htmlFor="training_load">Training Load *</label>
          <select
            id="training_load"
            name="training_load"
            value={formData.training_load}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="low">Low (1-2 hours/day)</option>
            <option value="moderate">Moderate (2-4 hours/day)</option>
            <option value="high">High (4+ hours/day)</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <p className="form-info">* Required fields</p>
    </div>
  );
}

export default AthleteProfile;
