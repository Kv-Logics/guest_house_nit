import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const submitBooking = async (bookingData) => {
    return await axios.post(`${API_BASE_URL}/bookings`, bookingData);
};