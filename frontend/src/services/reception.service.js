import api from './api';

export const receptionService = {
  getTodayArrivals: async () => api.get('/reception/arrivals'),
  getRooms: async () => api.get('/reception/rooms'),
  updateRoomStatus: async (roomNumber, status) => api.post(`/reception/rooms/${roomNumber}/status`, { status }),
  extendStay: async (bookingId, departure_datetime) => api.post(`/reception/bookings/${bookingId}/extend`, { departure_datetime }),
  assignRooms: async (id, allocated_room_numbers) => api.post(`/reception/${id}/assign-rooms`, { allocated_room_numbers }),
  checkIn: async (id, allocated_room_numbers) => api.post(`/reception/${id}/check-in`, { allocated_room_numbers }),
  checkInGuest: async (guestId) => api.post(`/reception/guests/${guestId}/check-in`),
  checkOut: async (id) => api.post(`/reception/${id}/check-out`),
  checkOutStay: async (stayId) => api.post(`/reception/stays/${stayId}/check-out`),
  updateGuestTimes: async (guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime) => 
    api.patch(`/reception/guests/${guestId}`, {
      arrival_datetime: arrivalDatetime,
      departure_datetime: departureDatetime,
      pending_extension_datetime: pendingExtensionDatetime
    }),
  roomTransfer: async (stayId, newRoomNumber, remarks, isGroup) =>
    api.post('/reception/rooms/transfer', { stayId, newRoomNumber, remarks, isGroup }),
  overrideBilling: async (payload) =>
    api.post('/reception/rooms/override', payload),
  getBillingLogs: async (bookingId) =>
    api.get(`/reception/bookings/${bookingId}/override-logs`),
};
