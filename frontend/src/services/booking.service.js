import api from './api';

export const bookingService = {
  createBooking: async (data) => api.post('/bookings', data),
  getMyBookings: async () => api.get('/bookings/my'),
  getBookingById: async (id) => api.get(`/bookings/${id}`),
  cancelBooking: async (id) => api.patch(`/bookings/${id}/cancel`),
  requestStayExtension: async (id, additional_days) =>
    api.post(`/bookings/${id}/stay-extension`, { additional_days }),
};
