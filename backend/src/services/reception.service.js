const receptionRepository = require('../repositories/reception.repository');
const logger = require('../utils/logger');

exports.getTodayArrivals = async () => {
    return await receptionRepository.getFrontDeskBookings();
};

exports.checkIn = async (bookingId, allocatedRooms) => {
    const booking = await receptionRepository.checkInBooking(bookingId, allocatedRooms);
    if (!booking) {
        logger.error(`Check-in failed for booking ID: ${bookingId}. Booking not found or not in a check-in ready state.`);
        throw new Error('Booking not found or not ready for check-in.');
    }
    logger.info(`Guest checked in for booking ID: ${bookingId}`);
    return booking;
};

exports.checkOut = async (bookingId) => {
    const booking = await receptionRepository.checkOutBooking(bookingId);
    if (!booking) {
        logger.error(`Check-out failed for booking ID: ${bookingId}. Booking not found or not in a checked-in state.`);
        throw new Error('Booking not found or not in a checked-in state.');
    }
    logger.info(`Guest checked out for booking ID: ${bookingId}`);
    return booking;
};

exports.updateGuestTimes = async (guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime) => {
    const guest = await receptionRepository.updateGuestTimes(guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime);
    if (!guest) {
        throw new Error('Guest not found.');
    }
    logger.info(`Updated check-in/out times for guest ID: ${guestId}`);
    return guest;
};