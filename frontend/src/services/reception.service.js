import api from './api';

export const receptionService = {
  getTariffs: async () => api.get('/bookings/tariffs'),
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
  getRoomHistory: async (roomNumber, page = 1, limit = 20) =>
    api.get(`/reception/rooms/${roomNumber}/history?page=${page}&limit=${limit}`),
    
  // POS & Billing
  getPendingPayments: async (limit = 50, offset = 0, search = '', monthFilter = 'current') => 
    api.get(`/reception/pending-payments?limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}&month_filter=${monthFilter}`),
  getCompletedPayments: async (limit = 50, offset = 0, search = '', monthFilter = 'current') => 
    api.get(`/reception/completed-payments?limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}&month_filter=${monthFilter}`),
  confirmPayment: async (bookingId, payload) => api.post(`/reception/bookings/${bookingId}/confirm-payment`, payload),
  
  // Institution Config
  getInstitutionConfig: async () => api.get('/reception/institution-config'),
  updateInstitutionConfig: async (payload) => api.post('/reception/institution-config', payload),
  
  // Bulk Rooms
  getActiveBulkBlocks: async () => api.get('/reception/bulk-blocks'),
  createBulkBlock: async (payload) => api.post('/reception/bulk-blocks', payload),
  checkInBulkGuest: async (bookingId, roomId, payload) => api.post(`/reception/bulk-blocks/${bookingId}/rooms/${roomId}/check-in`, payload)
};
