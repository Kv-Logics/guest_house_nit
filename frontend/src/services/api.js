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

  const isTimeMachineEnabled = import.meta.env.VITE_ENABLE_TIME_MACHINE === 'true';
  const isMockActive = localStorage.getItem('mock-system-date-active') === 'true';
  const mockDate = localStorage.getItem('mock-system-date');
  if (isTimeMachineEnabled && isMockActive && mockDate) {
    config.headers['X-Mock-Date'] = mockDate;
  }

  return config;
});

// Standardize Responses & Handle Automatic Token Refresh
api.interceptors.response.use(
  (response) => response.data, // Automatically strip Axios envelope to match Backend format
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    // Skip refresh logic for auth endpoints (login, OTP verify, etc.)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        // Attempt to refresh the token using HttpOnly cookie/backend endpoint
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });

        return api(originalRequest); // Retry original request
      } catch (refreshError) {
        window.location.href = '/login'; // Refresh completely failed, force re-auth
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error.response?.data || { success: false, message: error.message });
  }
);

export default api;
