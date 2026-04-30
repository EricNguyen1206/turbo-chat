/**
 * Centralized Axios Client Configuration
 *
 * Security approach:
 * - Uses httpOnly cookies for JWT tokens (set by backend)
 * - No token storage in frontend memory or localStorage
 * - withCredentials: true ensures cookies are sent with requests
 * - Automatic token refresh via httpOnly refresh token cookie
 * - Resilient: retries refresh once before redirecting to login
 */

import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiUrl, isDev } from "./config";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _refreshRetried?: boolean;
  }
}

const API_BASE_URL = apiUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isDev) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("🚨 Axios Request Error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _refreshRetried?: boolean };

    const isAuthEndpoint = originalRequest.url?.includes('/auth/signin') ||
      originalRequest.url?.includes('/auth/signup') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/signout') ||
      originalRequest.url?.includes('/auth/me');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => {
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/auth/refresh");
        processQueue(null, null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Retry refresh once after a short delay for transient failures
        if (!originalRequest._refreshRetried) {
          originalRequest._refreshRetried = true;
          try {
            await new Promise(r => setTimeout(r, 1000));
            await apiClient.post("/auth/refresh");
            processQueue(null, null);
            return apiClient(originalRequest);
          } catch {
            // Second attempt also failed
          }
        }

        processQueue(refreshError, null);

        // Only redirect to login if the refresh token is genuinely invalid (401/403)
        // Network errors (no status) should NOT redirect — user stays on page
        const status = (refreshError as any)?.response?.status;
        if ((status === 401 || status === 403) && typeof window !== "undefined") {
          localStorage.removeItem('auth-storage');
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isDev) {
      console.error("🚨 Axios Response Error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    return Promise.reject(error);
  }
);

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await apiClient.request<T>(config);
  return response.data;
};

export default apiClient;
