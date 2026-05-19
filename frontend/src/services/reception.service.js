import api from './api';

export const receptionService = {
  getTodayArrivals: async () => api.get('/reception/arrivals'),
  getRooms: async () => api.get('/reception/rooms'),
  updateRoomStatus: async (roomNumber, status) => api.post(`/reception/rooms/${roomNumber}/status`, { status }),
  extendStay: async (bookingId, departure_datetime) => api.post(`/reception/bookings/${bookingId}/extend`, { departure_datetime }),
  checkIn: async (id, allocated_room_numbers) => api.post(`/reception/${id}/check-in`, { allocated_room_numbers }),
  checkOut: async (id) => api.post(`/reception/${id}/check-out`),
  updateGuestTimes: async (guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime) => 
    api.patch(`/reception/guests/${guestId}`, {
      arrival_datetime: arrivalDatetime,
      departure_datetime: departureDatetime,
      pending_extension_datetime: pendingExtensionDatetime
    }),
};
