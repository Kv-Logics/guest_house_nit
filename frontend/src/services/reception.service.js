import api from './api';

export const receptionService = {
    getTodayArrivals: async () => api.get('/reception/arrivals'),
    checkIn: async (id) => api.post(`/reception/${id}/check-in`),
    checkOut: async (id) => api.post(`/reception/${id}/check-out`)
};