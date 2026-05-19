import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // Crucial for HttpOnly cookies
});

// Add CSRF token from cookie to request headers
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
  return config;
});

// Standardize Responses & Handle Automatic Redirect on 401
api.interceptors.response.use(
  (response) => response.data, // Automatically strip Axios envelope to match Backend format
  async (error) => {
    if (error.response?.status === 401) {
      // Wipe 'user' metadata from localStorage
      localStorage.removeItem('user');
      // Clear the session by bouncing the window location back to the Central Auth authorize endpoint
      window.location.href = 'http://localhost:5000/api/v1/auth/authorize?redirectTo=http://localhost:3000/auth/callback';
      return new Promise(() => {}); // Halt the promise chain
    }
    return Promise.reject(error.response?.data || { success: false, message: error.message });
  }
);

export default api;
