import api from './api';

export const receptionService = {
  getTodayArrivals: async () => api.get('/reception/arrivals'),
  checkIn: async (id, allocated_room_numbers) => api.post(`/reception/${id}/check-in`, { allocated_room_numbers }),
  checkOut: async (id) => api.post(`/reception/${id}/check-out`),
};
