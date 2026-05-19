import api from '../services/api';

export const submitBooking = async (bookingData) => {
  return await api.post('/bookings', bookingData);
};
