import api from './api';

export const authService = {
  requestOtp: async (email) => api.post('/auth/request-otp', { email }),
  verifyOtp: async (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  logout: async () => api.post('/auth/logout'),
  getProfile: async () => api.get('/auth/me'),
};
