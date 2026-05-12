import api from './api';

export const bookingService = {
  createBooking: async (data) => api.post('/bookings', data),
  getMyBookings: async () => api.get('/bookings/my'),
  getBookingById: async (id) => api.get(`/bookings/${id}`),
  cancelBooking: async (id) => api.patch(`/bookings/${id}/cancel`),
  requestStayExtension: async (id, new_departure_datetime) =>
    api.post(`/bookings/${id}/stay-extension`, { new_departure_datetime }),
};
