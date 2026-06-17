import api from './api';

export const authService = {
  login: async (email, password) => api.post('/auth/login', { email, password }),
  requestOtp: async (email) => api.post('/auth/request-otp', { email }),
  checkUserStatus: async (email) => api.post('/auth/check-status', { email }),
  verifyOtp: async (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  setupPassword: async (setupToken, password) => api.post('/auth/setup-password', { setupToken, password }),
  logout: async () => api.post('/auth/logout'),
  getProfile: async () => api.get('/auth/me'),
  getSystemConfig: async () => api.get('/reception/institution-config'),
};
