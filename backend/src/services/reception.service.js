const receptionRepository = require('../repositories/reception.repository');
const { BOOKING_STATUS } = require('../utils/constants');

exports.getTodayArrivals = async () => {
    return await receptionRepository.getArrivalsByStates([
        BOOKING_STATUS.ADMIN_APPROVED,
        BOOKING_STATUS.READY_FOR_CHECKIN,
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.CHECKED_OUT
    ]);
};

exports.checkIn = async (bookingId) => {
    const booking = await receptionRepository.updateBookingState(bookingId, BOOKING_STATUS.CHECKED_IN, 'checked_in_at');
    if (!booking) throw new Error('Booking not found');
    return booking;
};

exports.checkOut = async (bookingId) => {
    const booking = await receptionRepository.updateBookingState(bookingId, BOOKING_STATUS.CHECKED_OUT, 'checked_out_at');
    if (!booking) throw new Error('Booking not found');
    return booking;
};