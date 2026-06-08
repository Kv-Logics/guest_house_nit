import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Crucial for HttpOnly cookies
});

// Add CSRF token from cookie and Mock System Date to request headers
api.interceptors.request.use((config) => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };
  const csrfToken = getCookie('csrf-token');
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  let isTimeMachineEnabled = import.meta.env.VITE_ENABLE_TIME_MACHINE === 'true'; // Fallback to env
  try {
      const sysConfigStr = localStorage.getItem('sys-config');
      if (sysConfigStr) {
          const sysConfig = JSON.parse(sysConfigStr);
          isTimeMachineEnabled = sysConfig.enable_time_machine !== false;
      }
  } catch (e) {
      // config not set
  }

  const isMockActive = localStorage.getItem('mock-system-date-active') === 'true';
  const mockDate = localStorage.getItem('mock-system-date');
  if (isTimeMachineEnabled && isMockActive && mockDate) {
    config.headers['X-Mock-Date'] = mockDate;
  }

  return config;
});

// Single in-flight refresh guard — prevents multiple concurrent requests from
// each triggering their own refresh, causing an infinite loop.
let _refreshPromise = null;
let _isRedirecting = false;

const forceLogout = () => {
  if (_isRedirecting) return;
  _isRedirecting = true;
  _refreshPromise = null;
  localStorage.removeItem('sys-config');
  window.location.href = '/login';
};

// Standardize Responses & Handle Automatic Token Refresh
api.interceptors.response.use(
  (response) => response.data, // Automatically strip Axios envelope to match Backend format
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Never retry auth endpoints or already-retried requests
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    if (isAuthEndpoint || originalRequest._retry || _isRedirecting) {
      return Promise.reject(error.response?.data || { success: false, message: error.message });
    }

    if (status === 401) {
      originalRequest._retry = true;

      // Reuse an in-flight refresh rather than firing N parallel refresh calls
      if (!_refreshPromise) {
        _refreshPromise = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
          .finally(() => { _refreshPromise = null; });
      }

      try {
        await _refreshPromise;
        return api(originalRequest); // Retry original request once
      } catch {
        forceLogout();
        return Promise.reject({ success: false, message: 'Session expired. Please log in again.' });
      }
    }

    return Promise.reject(error.response?.data || { success: false, message: error.message });
  }
);

export default api;
