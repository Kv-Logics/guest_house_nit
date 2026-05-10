import api from './api';

export const bookingService = {
    createBooking: async (data) => api.post('/bookings', data),
    getMyBookings: async () => api.get('/bookings/my'),
    getBookingById: async (id) => api.get(`/bookings/${id}`),
    cancelBooking: async (id) => api.patch(`/bookings/${id}/cancel`)
};