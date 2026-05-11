const receptionRepository = require('../repositories/reception.repository');
const { BOOKING_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

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
    if (!booking) {
        logger.error(`Check-in failed for booking ID: ${bookingId}. Booking not found or not in a check-in ready state.`);
        throw new Error('Booking not found or not ready for check-in.');
    }
    logger.info(`Guest checked in for booking ID: ${bookingId}`);
    return booking;
};

exports.checkOut = async (bookingId) => {
    const booking = await receptionRepository.updateBookingState(bookingId, BOOKING_STATUS.CHECKED_OUT, 'checked_out_at');
    if (!booking) {
        logger.error(`Check-out failed for booking ID: ${bookingId}. Booking not found or not in a checked-in state.`);
        throw new Error('Booking not found or not in a checked-in state.');
    }
    logger.info(`Guest checked out for booking ID: ${bookingId}`);
    return booking;
};