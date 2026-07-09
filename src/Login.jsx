// ============================================================================
// LOGIN COMPONENT - User login page
// ============================================================================
// What does this do?
// This component shows a login form where users enter email & password
// When submitted, it sends credentials to backend and logs them in
// ============================================================================

import React, { useState } from "react";
import { loginUser } from "./apiService";
import "./Auth.css"; // Styling for this component

/**
 * Login Component
 * 
 * Props:
 * - onSuccess: Callback function when login succeeds
 * - onToggle: Function to switch between login and register forms
 */
export default function Login({ onSuccess, onToggle }) {
  // ========================================================================
  // STATE VARIABLES - Data that changes
  // ========================================================================
  
  // Email entered by user
  const [email, setEmail] = useState("");
  
  // Password entered by user
  const [password, setPassword] = useState("");
  
  // Error message to display (if login fails)
  const [error, setError] = useState("");
  
  // Loading state (show spinner while logging in)
  const [loading, setLoading] = useState(false);

  // ========================================================================
  // HANDLE FORM SUBMISSION
  // ========================================================================
  /**
   * What happens when user clicks "Login" button:
   * 1. Prevent page refresh
   * 2. Validate inputs (email and password filled?)
   * 3. Send to backend via loginUser()
   * 4. If success → save token & call onSuccess()
   * 5. If error → show error message
   */
  const handleLogin = async (e) => {
    // Prevent page refresh on form submit
    e.preventDefault();

    // Clear previous errors
    setError("");

    // Validate: Make sure email and password are filled
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Validate: Basic email format check
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    try {
      // Show loading state
      setLoading(true);

      // Send login request to backend
      // Backend checks if email exists and password matches
      const response = await loginUser(email, password);

      // If successful, show success message
      console.log("Login successful:", response);

      // Call the callback function passed from parent
      // This usually navigates to dashboard
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // If login fails, show error message
      // Error could be: "Invalid email or password", network error, etc.
      setError(err.message || "Login failed. Please try again.");
    } finally {
      // Always hide loading spinner
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
        <p>Login to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="auth-form">
        
        {/* Error Message Display */}
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Email Input Field */}
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

        {/* Password Input Field */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="auth-button"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Link to Register Page */}
      <div className="auth-footer">
        <p>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onToggle}
            className="toggle-link"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// LEARNING NOTES - What's happening here?
// ============================================================================
/**
 * 1. useState() creates variables that React watches
 *    - When these change, React re-renders the component
 *    - Example: When user types, setEmail() is called → component updates
 *
 * 2. handleLogin() is our login logic
 *    - It's async (waits for backend response)
 *    - It validates data before sending
 *    - It handles errors gracefully
 *
 * 3. The form part is JSX (looks like HTML but is JavaScript)
 *    - onChange={(e) => setEmail(e.target.value)} means:
 *      "When user types in input, update email state"
 *    - disabled={loading} means:
 *      "Disable button while loading"
 *
 * 4. apiService.loginUser() calls our backend
 *    - Backend checks email/password
 *    - Returns JWT token if successful
 *    - Token is saved in localStorage (browser memory)
 *    - This token proves user is logged in
 */

// ============================================================================
// MODIFY THESE FOR LEARNING
// ============================================================================
/**
 * EXERCISE 1: Change the error message color
 * Look for: ".error-message" in Auth.css and change the background color
 *
 * EXERCISE 2: Add "Remember me" checkbox
 * Add this to form: 
 *   <input type="checkbox" /> Remember me
 *
 * EXERCISE 3: Add "Forgot password" link
 * Add this in auth-footer:
 *   <a href="#forgot">Forgot password?</a>
 *
 * EXERCISE 4: Change button text
 * Line 100: Change "Login" to "Sign In"
 */
