const API_URL = "http://localhost:8000/api";

function makeRequest(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("token");
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  return fetch(`${API_URL}${endpoint}`, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      return response.json();
    });
}

export async function registerUser(name, email, password, role) {
  const response = await makeRequest("/auth/register", "POST", {
    name,
    email,
    password,
    role,
  });
  return response;
}

export async function loginUser(email, password) {
  const response = await makeRequest("/auth/login", "POST", {
    email,
    password,
  });

  if (response.access_token) {
    localStorage.setItem("token", response.access_token);
    localStorage.setItem("user", JSON.stringify(response.user));
  }

  return response;
}

export function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function isUserLoggedIn() {
  return !!localStorage.getItem("token");
}

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

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

export async function checkBackendHealth() {
  try {
    const response = await fetch(API_URL.replace("/api", ""));
    return await response.json();
  } catch (error) {
    console.error("Backend is not running:", error);
    return null;
  }
}
