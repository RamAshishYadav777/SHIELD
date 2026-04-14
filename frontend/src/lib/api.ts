import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';

const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
};

// setup axios with base url and cookies
const api = axios.create({
  baseURL: getBaseURL().replace(/\/$/, '') + '/',
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (config.url?.startsWith('/')) {
    config.url = config.url.substring(1);
  }
  return config;
});

// variables for token refreshing
let isRefreshing = false;
let failedQueue: any[] = [];
let isLoggingOut = false;

export const setLoggingOutFlag = (value: boolean) => {
  isLoggingOut = value;
};

// helper to run all requests that were waiting for refresh
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

// handle 401 errors by trying to refresh the token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    const isAuthRequest = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/verify-otp') ||
      originalRequest.url?.includes('/auth/forgot-password');

    const authPages = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password', '/'];
    const isAuthPage = typeof window !== 'undefined' && authPages.includes(window.location.pathname);

    // if token expired (401), try to get a new one
    if (error.response?.status === 401 && !isLoggingOut && !isAuthPage && !isAuthRequest && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // call the refresh endpoint
        await axios.get(`${api.defaults.baseURL}auth/refresh`.replace(/\/+/g, '/').replace(':/', '://'), { withCredentials: true });
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
