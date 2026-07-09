// ============================================================================
// API SERVICE - Bridge between React Frontend and FastAPI Backend
// ============================================================================
// Think of this as a mailman that delivers messages to the backend server
// and brings back responses
// ============================================================================

// Base URL where our backend is running
const API_BASE_URL = "http://localhost:8000/api";

// ============================================================================
// Helper Function: Make API Requests
// ============================================================================
/**
 * This is a general function to make requests to our backend
 * 
 * How it works:
 * 1. Takes the endpoint (like "/auth/login")
 * 2. Takes the method (GET, POST, etc.)
 * 3. Takes the data to send
 * 4. Gets token from localStorage if user is logged in
 * 5. Sends request to backend
 * 6. Returns response
 */
async function makeRequest(endpoint, method = "GET", data = null) {
  try {
    // Prepare the configuration for the request
    const config = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // If user is logged in, add token to headers
    // This token proves we're authenticated
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // If we're sending data (POST, PUT), add it to body
    if (data) {
      config.body = JSON.stringify(data);
    }

    // Make the actual request to backend
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Check if response is successful
    if (!response.ok) {
      // If not, get error message from backend
      const error = await response.json();
      throw new Error(error.detail || "Request failed");
    }

    // Return the response data
    return await response.json();
  } catch (error) {
    // If something goes wrong, throw error
    console.error("API Error:", error);
    throw error;
  }
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Register new user
 * Sends email, password, name, and role to backend
 */
export async function registerUser(email, password, fullName, role = "athlete") {
  return makeRequest("/auth/register", "POST", {
    email: email,
    password: password,
    full_name: fullName,
    role: role,
  });
}

/**
 * Login user
 * Sends email and password, gets back JWT token
 */
export async function loginUser(email, password) {
  const response = await makeRequest("/auth/login", "POST", {
    email: email,
    password: password,
  });

  // If login successful, save token in localStorage
  // localStorage is like a notepad that remembers things after page refresh
  if (response.access_token) {
    localStorage.setItem("token", response.access_token);
    localStorage.setItem("user", JSON.stringify(response.user));
  }

  return response;
}

/**
 * Logout user
 * Just clear the token from localStorage
 */
export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return await makeRequest("/auth/me", "GET", null);
  } catch (error) {
    // If token is invalid, clear it
    logoutUser();
    return null;
  }
}

/**
 * Check if user is logged in
 */
export function isUserLoggedIn() {
  return !!localStorage.getItem("token");
}

// ============================================================================
// ATHLETE PROFILE FUNCTIONS
// ============================================================================

/**
 * Create or update athlete profile
 * Stores athletic info like sport, position, age, weight, etc.
 */

export async function createAthleteProfile(profileData) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const email = user.email || "athlete@test.com";
  
  return makeRequest(`/athletes/profile?email=${email}`, "POST", profileData);
}

export async function getAthleteProfile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const email = user.email || "athlete@test.com";
  
  try {
    return await makeRequest(`/athletes/profile?email=${email}`, "GET", null);
  } catch (error) {
    return null;
  }
}
// ============================================================================
// VIDEO FUNCTIONS
// ============================================================================

/**
 * Upload video
 * Sends video metadata to backend
 */
export async function uploadVideo(videoName, activityType, videoUrl) {
  return makeRequest("/videos/upload", "POST", {
    video_name: videoName,
    activity_type: activityType,
    video_url: videoUrl,
  });
}

/**
 * Get list of all videos uploaded by user
 */
export async function getVideosList() {
  try {
    return await makeRequest("/videos/list", "GET", null);
  } catch (error) {
    return { videos: [] };
  }
}

/**
 * Get single video details
 */
export async function getVideoDetails(videoId) {
  return makeRequest(`/videos/${videoId}`, "GET", null);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if backend server is running
 * Useful for debugging connection issues
 * 
 */

export async function checkBackendHealth() {
  try {
    const response = await fetch("http://localhost:8000");
    return await response.json();
  } catch (error) {
    console.error("Backend is not running:", error);
    return null;
  }
}
