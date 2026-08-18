import React, { useState, useEffect } from 'react';
import { createAthleteProfile, getAthleteProfile } from './apiService';
import './AthleteProfile.css';

function AthleteProfile({ onSuccess }) {
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getAthleteProfile();
      if (profile) {
        setFormData({
          sport_type: profile.sport_type || '',
          position: profile.position || '',
          age: profile.age != null ? String(profile.age) : '',
          height: profile.height != null ? String(profile.height) : '',
          weight: profile.weight != null ? String(profile.weight) : '',
          injury_history: profile.injury_history || '',
          training_load: profile.training_load || 'moderate'
        });
        setEditMode(false);
      }
    } catch (err) {
      setEditMode(true);
    }
  };

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
    setSuccess('');

    const requiredFields = ['sport_type', 'position', 'age', 'height', 'weight'];
    const missing = requiredFields.filter(f => !formData[f] || !String(formData[f]).trim());
    if (missing.length > 0) {
      setError('Please fill in all required fields');
      return;
    }

    const ageNum = Number(formData.age);
    const heightNum = Number(formData.height);
    const weightNum = Number(formData.weight);

    if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
      setError('Age must be a number between 13 and 100');
      return;
    }
    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      setError('Height must be a number between 100 and 250 cm');
      return;
    }
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      setError('Weight must be a number between 30 and 200 kg');
      return;
    }

    try {
      setLoading(true);
      await createAthleteProfile({
        ...formData,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
      });
      setSuccess('Profile saved successfully!');
      setEditMode(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (!editMode) {
    return (
      <div className="athlete-profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div>
              <h2>Athlete Profile</h2>
              <p className="profile-subtitle">Your saved athletic information</p>
            </div>
            <button onClick={() => setEditMode(true)} className="edit-btn">
              Edit Profile
            </button>
          </div>

          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-label">Sport Type</span>
              <span className="profile-value">{formData.sport_type}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Position</span>
              <span className="profile-value">{formData.position}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Age</span>
              <span className="profile-value">{formData.age} years</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Height</span>
              <span className="profile-value">{formData.height} cm</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Weight</span>
              <span className="profile-value">{formData.weight} kg</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Training Load</span>
              <span className="profile-value" style={{ textTransform: 'capitalize' }}>{formData.training_load}</span>
            </div>
            <div className="profile-item profile-item-full">
              <span className="profile-label">Previous Injuries</span>
              <span className="profile-value">{formData.injury_history || 'None reported'}</span>
            </div>
          </div>

          <p className="profile-info">Your profile is saved and will be used for injury risk assessment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="athlete-profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div>
            <h2>Create / Edit Athlete Profile</h2>
            <p className="profile-subtitle">Enter your athletic information for injury risk assessment</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sport_type">Sport Type <span className="required">*</span></label>
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

            <div className="form-group">
              <label htmlFor="position">Position <span className="required">*</span></label>
              <input
                id="position"
                type="text"
                name="position"
                placeholder="e.g., Guard, Forward, Batsman"
                value={formData.position}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age (years) <span className="required">*</span></label>
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

            <div className="form-group">
              <label htmlFor="height">Height (cm) <span className="required">*</span></label>
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

            <div className="form-group">
              <label htmlFor="weight">Weight (kg) <span className="required">*</span></label>
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
          </div>

          <div className="form-group">
            <label htmlFor="injury_history">Previous Injuries</label>
            <textarea
              id="injury_history"
              name="injury_history"
              placeholder="e.g., Right ankle sprain in 2023"
              value={formData.injury_history}
              onChange={handleChange}
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="training_load">Training Load <span className="required">*</span></label>
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

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AthleteProfile;
