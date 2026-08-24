const API_URL = "http://localhost:8001/api";
const ANALYSIS_URL = "http://localhost:8001/analysis";

function getToken() {
  return localStorage.getItem("token");
}

function parseApiError(error) {
  if (!error) return "An unknown error occurred";
  const message = error.message || String(error);
  try {
    const parsed = JSON.parse(message);
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((d) => d.msg || d).join(", ");
    }
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
    if (parsed.message) {
      return parsed.message;
    }
    return message;
  } catch {
    return message;
  }
}

function getFriendlyMessage(error, context) {
  const msg = error.message || String(error);
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
    return "Unable to connect to the analysis server. Please make sure the backend is running.";
  }
  if (msg.includes("Email already registered")) {
    return "An account with this email already exists.";
  }
  if (msg.includes("Invalid email or password")) {
    return "Invalid email or password.";
  }
  if (msg.includes("Profile not found")) {
    return "No athlete profile found. Please create one.";
  }
  if (msg.includes("Analysis not found")) {
    return "Analysis record not found.";
  }
  if (msg.includes("File size exceeds")) {
    return "File size exceeds the 100MB limit.";
  }
  if (msg.includes("Upload failed")) {
    return "Video upload failed. Please try again.";
  }
  if (msg.includes("analysis") && msg.includes("save")) {
    return "Video analysis failed. Please try again.";
  }
  if (msg.includes("Invalid or expired reset token")) {
    return "The password reset link is invalid or has expired.";
  }
  if (msg.includes("Admin access required")) {
    return "You do not have permission to access this area.";
  }
  if (msg.includes("Access denied")) {
    return "You do not have permission to access this resource.";
  }
  return msg;
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || `API Error: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail.map((d) => d.msg || d).join(", ");
        } else if (typeof parsed.detail === "string") {
          errorMessage = parsed.detail;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        if (!errorText) errorMessage = `API Error: ${response.statusText}`;
      }
      throw new Error(getFriendlyMessage(new Error(errorMessage), endpoint));
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return response;
  } catch (error) {
    throw new Error(getFriendlyMessage(error, endpoint));
  }
}

async function analysisRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${ANALYSIS_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || `API Error: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail.map((d) => d.msg || d).join(", ");
        } else if (typeof parsed.detail === "string") {
          errorMessage = parsed.detail;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        if (!errorText) errorMessage = `API Error: ${response.statusText}`;
      }
      throw new Error(getFriendlyMessage(new Error(errorMessage), endpoint));
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return response;
  } catch (error) {
    throw new Error(getFriendlyMessage(error, endpoint));
  }
}

export async function registerUser(full_name, email, password) {
  const payload = { full_name, email, password };
  const response = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response;
}

export async function loginUser(email, password) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.access_token) {
    localStorage.setItem("token", response.access_token);
    localStorage.setItem("user", JSON.stringify(response.user));
  }

  return response;
}

export async function googleAuth(credential) {
  const response = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
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

export async function verifyCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    return await request("/auth/me", { method: "GET" });
  } catch (error) {
    logoutUser();
    return null;
  }
}

export function isUserLoggedIn() {
  return !!localStorage.getItem("token");
}

export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function createAthleteProfile(profileData) {
  const response = await request(`/athletes/profile`, {
    method: "POST",
    body: JSON.stringify(profileData),
  });
  return response;
}

export async function getAthleteProfile() {
  try {
    const response = await request(`/athletes/profile`, { method: "GET" });
    return response;
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

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);

  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/videos/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText || `Upload failed: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (Array.isArray(parsed.detail)) {
        errorMessage = parsed.detail.map((d) => d.msg || d).join(", ");
      } else if (typeof parsed.detail === "string") {
        errorMessage = parsed.detail;
      } else if (parsed.message) {
        errorMessage = parsed.message;
      }
    } catch {
      if (!errorText) errorMessage = `Upload failed: ${response.statusText}`;
    }
    throw new Error(getFriendlyMessage(new Error(errorMessage), "/videos/upload"));
  }

  return await response.json();
}

export async function saveAnalysis(analysisData) {
  const response = await analysisRequest("/save", {
    method: "POST",
    body: JSON.stringify(analysisData),
  });
  return response;
}

export async function getAnalysisHistory(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const response = await analysisRequest(`/history?${params.toString()}`, {
    method: "GET",
  });
  return response;
}

export async function getAnalysisById(id) {
  const response = await analysisRequest(`/${id}`, {
    method: "GET",
  });
  return response;
}

export async function deleteAnalysis(id) {
  const response = await analysisRequest(`/${id}`, {
    method: "DELETE",
  });
  return response;
}

export async function downloadReport(id) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${ANALYSIS_URL}/${id}/report`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || `Report download failed: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (Array.isArray(parsed.detail)) {
          errorMessage = parsed.detail.map((d) => d.msg || d).join(", ");
        } else if (typeof parsed.detail === "string") {
          errorMessage = parsed.detail;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        if (!errorText) errorMessage = `Report download failed: ${response.statusText}`;
      }
      throw new Error(getFriendlyMessage(new Error(errorMessage), `/${id}/report`));
    }

    const blob = await response.blob();
    const urlObj = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlObj;
    link.setAttribute("download", `report_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlObj);
  } catch (error) {
    throw new Error(getFriendlyMessage(error, `/${id}/report`));
  }
}

export async function getNotifications(unreadOnly = false) {
  const url = unreadOnly ? "/notifications?unread_only=true" : "/notifications";
  const response = await request(url, { method: "GET" });
  return response;
}

export async function getAdminNotifications(unreadOnly = false) {
  const url = unreadOnly ? "/admin/notifications?unread_only=true" : "/admin/notifications";
  const response = await request(url, { method: "GET" });
  return response;
}

export async function markNotificationRead(notificationId) {
  const response = await request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return response;
}

export async function markAllNotificationsRead() {
  const response = await request(`/notifications/read-all`, {
    method: "PATCH",
  });
  return response;
}

export async function forgotPassword(email) {
  const response = await request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
}

export async function resetPassword(token, newPassword) {
  const response = await request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  return response;
}

export async function getAdminStats() {
  const response = await request("/admin/stats", { method: "GET" });
  return response;
}

export async function getAdminUsers() {
  const response = await request("/admin/users", { method: "GET" });
  return response;
}

export async function getAdminAnalyses(page = 1, perPage = 20) {
  const response = await request(`/admin/analyses?page=${page}&per_page=${perPage}`, {
    method: "GET",
  });
  return response;
}

export async function getAdminActivity() {
  const response = await request("/admin/activity", { method: "GET" });
  return response;
}

export async function getDashboardSummary() {
  const response = await request("/dashboard/summary", { method: "GET" });
  return response;
}

export async function getDashboardRiskDistribution() {
  const response = await request("/dashboard/risk-distribution", { method: "GET" });
  return response;
}

export async function getDashboardMovementMetrics() {
  const response = await request("/dashboard/movement-metrics", { method: "GET" });
  return response;
}

export async function getDashboardRiskTrend() {
  const response = await request("/dashboard/risk-trend", { method: "GET" });
  return response;
}

export async function getAdminAnalyticsRiskDistribution() {
  const response = await request("/admin/analytics/risk-distribution", { method: "GET" });
  return response;
}

export async function getAdminAnalysesOverTime() {
  const response = await request("/admin/analytics/analyses-over-time", { method: "GET" });
  return response;
}

export async function getAdminAnalyticsMovementMetrics() {
  const response = await request("/admin/analytics/movement-metrics", { method: "GET" });
  return response;
}

export { parseApiError };
