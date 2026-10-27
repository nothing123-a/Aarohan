import axios, { AxiosError } from "axios";

export interface ApiClientError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Pre-configured Axios instance for all API calls.
 * Points to /api which is proxied to the FastAPI backend (http://127.0.0.1:8000).
 */
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor — attach JWT ─────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle errors cleanly ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | unknown; message?: string; error?: string }>) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    let message = "An unexpected error occurred.";
    if (errorData?.detail) {
      message = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (errorData?.error) {
      message = errorData.error;
    } else if (error.code === "ECONNABORTED") {
      message = "Request timed out. Please verify your connection.";
    } else if (!error.response) {
      message = "Network error: Unable to connect to FDR-SMART backend.";
    }

    if (status === 401) {
      // Clear expired credentials
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else if (status === 403) {
      console.warn("Permission denied: You do not have authorization for this regulatory action.", message);
    } else if (status === 404) {
      console.warn("Requested record not found in central registry.", message);
    } else if (status && status >= 500) {
      console.error("Central server error encountered:", message);
    }

    const structuredError: ApiClientError = {
      status: status || 0,
      message,
      code: error.code,
      details: errorData,
    };

    return Promise.reject(structuredError);
  }
);

export default apiClient;
