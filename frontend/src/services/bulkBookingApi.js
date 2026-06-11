import api from './api';

export const bulkBookingApi = {
  // Fetch a list of bulk bookings
  getBulkBookings: async (limit = 100, offset = 0, statusFilter = null, searchQuery = null) => {
    const params = { limit, offset };
    if (statusFilter) params.statusFilter = statusFilter;
    if (searchQuery) params.searchQuery = searchQuery;
    return await api.get('/bulk-bookings', { params });
  },

  // Get details of a single bulk booking
  getBulkBookingById: async (id) => {
    return await api.get(`/bulk-bookings/${id}`);
  },

  // Create a new bulk booking draft
  createBulkBooking: async (data) => {
    return await api.post('/bulk-bookings', data);
  },

  // Update a draft bulk booking (e.g., change details before submission)
  updateBulkBookingDraft: async (id, data) => {
    return await api.put(`/bulk-bookings/${id}`, data);
  },

  // Delete a bulk booking
  deleteBulkBooking: async (id) => {
    return await api.delete(`/bulk-bookings/${id}`);
  },

  // Submit the draft for approval
  submitBulkBooking: async (id) => {
    return await api.post(`/bulk-bookings/${id}/submit`);
  },

  // Add multiple guests to the bulk booking
  addGuests: async (id, guests) => {
    return await api.post(`/bulk-bookings/${id}/guests`, { guests });
  },

  // Update a single guest
  updateGuest: async (id, guestId, data) => {
    return await api.put(`/bulk-bookings/${id}/guests/${guestId}`, data);
  },

  // Remove a single guest
  removeGuest: async (id, guestId) => {
    return await api.delete(`/bulk-bookings/${id}/guests/${guestId}`);
  },

  // Proxy to Reception Service for Bulk Actions
  allocateRooms: async (id, rooms) => {
    return await api.post(`/bulk-bookings/${id}/allocate-rooms`, { rooms });
  },

  addRooms: async (id, roomIds) => {
    return await api.post(`/bulk-bookings/${id}/rooms`, { roomIds });
  },

  checkInAll: async (id, guestRoomAssignments) => {
    return await api.post(`/bulk-bookings/${id}/check-in`, { guestRoomAssignments });
  },

  checkInGuest: async (id, stayId) => {
    return await api.post(`/bulk-bookings/${id}/check-in-guest/${stayId}`);
  },

  checkOutAll: async (id) => {
    return await api.post(`/bulk-bookings/${id}/check-out`);
  },

  checkOutGuest: async (id, stayId, data) => {
    return await api.post(`/bulk-bookings/${id}/check-out-guest/${stayId}`, data);
  },

  generateBill: async (id, payload) => {
    return await api.post(`/bulk-bookings/${id}/generate-bill`, payload);
  },

  completePayment: async (id, payload) => {
    return await api.post(`/bulk-bookings/${id}/complete-payment`, payload);
  },

  updateStayOccupancy: async (id, stayId, payload) => {
    return await api.post(`/bulk-bookings/${id}/stays/${stayId}/update-occupancy`, payload);
  }
};
