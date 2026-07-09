// ============================================================================
// REGISTER COMPONENT - User registration page
// ============================================================================
// What does this do?
// Shows a form for new users to create an account
// Sends email, password, name, and role to backend
// ============================================================================

import React, { useState } from "react";
import { registerUser } from "./apiService";
import "./Auth.css"; // Styling

/**
 * Register Component
 * 
 * Props:
 * - onSuccess: Callback when registration succeeds
 * - onToggle: Function to switch to login page
 */
export default function Register({ onSuccess, onToggle }) {
  // ========================================================================
  // STATE VARIABLES - Form data
  // ========================================================================
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("athlete"); // Default role is athlete
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ========================================================================
  // HANDLE FORM SUBMISSION
  // ========================================================================
  /**
   * What happens when user clicks "Register" button:
   * 1. Validate all fields are filled
   * 2. Validate email format
   * 3. Check passwords match
   * 4. Send to backend via registerUser()
   * 5. If success → automatically log them in
   * 6. If error → show error message
   */
  const handleRegister = async (e) => {
    e.preventDefault(); // Prevent page refresh
    setError(""); // Clear previous errors

    // ====================================================================
    // VALIDATION - Check if all data is correct
    // ====================================================================

    // Check: All fields filled?
    if (!email || !password || !confirmPassword || !fullName) {
      setError("Please fill in all fields");
      return;
    }

    // Check: Valid email format?
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email");
      return;
    }

    // Check: Password long enough?
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Check: Passwords match?
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // Send registration request to backend
      // Backend will:
      // 1. Check if email already exists
      // 2. Create new user
      // 3. Save in database
      const response = await registerUser(email, password, fullName, role);

      console.log("Registration successful:", response);

      // After successful registration, show success message
      // In real app, you might auto-login here
      alert(`Welcome ${fullName}! Please login to continue.`);

      // Call callback to switch to login page
      if (onToggle) {
        onToggle();
      }
    } catch (err) {
      // Show error if registration fails
      // Could be: "Email already registered", network error, etc.
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // RENDER - What user sees on screen
  // ========================================================================
  return (
    <div className="auth-container">
      {/* Header */}
      <div className="auth-header">
        <h2>Sports Injury Detection</h2>
        <p>Create a new account</p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleRegister} className="auth-form">
        
        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Full Name Input */}
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Email Input */}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="athlete@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Role Selection */}
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
          >
            <option value="athlete">Athlete</option>
            <option value="coach">Coach</option>
            <option value="physiotherapist">Physiotherapist</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Password Input */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <small>Must be at least 6 characters</small>
        </div>

        {/* Confirm Password Input */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Register Button */}
        <button
          type="submit"
          className="auth-button"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      {/* Link to Login Page */}
      <div className="auth-footer">
        <p>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onToggle}
            className="toggle-link"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// LEARNING NOTES
// ============================================================================
/**
 * Key concepts:
 * 
 * 1. useState() - Creates state variables
 *    Example: const [email, setEmail] = useState("")
 *    - "email" is the current value
 *    - "setEmail" is the function to update it
 *    - "" is the initial value
 *
 * 2. Validation - Checking data before sending
 *    Why? Prevent invalid data from reaching backend
 *    Examples:
 *      - Check email has @ and .
 *      - Check password is 6+ characters
 *      - Check passwords match
 *
 * 3. async/await - Waiting for backend response
 *    Why? Network takes time, we must wait for response
 *    Code waits at: await registerUser(...)
 *    Then continues when backend responds
 *
 * 4. try/catch - Error handling
 *    try: Do the risky thing (network request)
 *    catch: If error happens, handle it gracefully
 *    finally: Always do this (stop loading spinner)
 *
 * 5. <select> - Dropdown menu
 *    Shows options: Athlete, Coach, Physiotherapist, Admin
 *    User picks one → stored in "role" state
 */

// ============================================================================
// EXERCISES TO MODIFY
// ============================================================================
/**
 * EXERCISE 1: Add terms checkbox
 * Add this before Register button:
 *   <label>
 *     <input type="checkbox" required />
 *     I agree to terms and conditions
 *   </label>
 *
 * EXERCISE 2: Show password strength
 * Add after password input:
 *   {password.length >= 6 && <small>✅ Strong password</small>}
 *
 * EXERCISE 3: Change role options
 * Add a new option: <option value="trainer">Personal Trainer</option>
 *
 * EXERCISE 4: Add phone number field
 * Add new state: const [phone, setPhone] = useState("");
 * Add input field for phone
 * Add phone to registerUser() call
 */
