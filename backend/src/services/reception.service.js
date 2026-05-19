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
    
    // Update statuses of allocated rooms to 'occupied'
    if (allocatedRooms) {
        const roomNumbersList = allocatedRooms.split(',').map(rn => rn.trim());
        for (const rn of roomNumbersList) {
            await receptionRepository.updateRoomStatus(rn, 'occupied');
        }
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
    
    // Update statuses of allocated rooms to 'cleaning'
    if (booking.allocated_room_numbers) {
        const roomNumbersList = booking.allocated_room_numbers.split(',').map(rn => rn.trim());
        for (const rn of roomNumbersList) {
            await receptionRepository.updateRoomStatus(rn, 'cleaning');
        }
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

exports.getRoomsWithStays = async () => {
    return await receptionRepository.getRoomsWithStays();
};

exports.updateRoomStatus = async (roomNumber, newStatus) => {
    const room = await receptionRepository.updateRoomStatus(roomNumber, newStatus);
    if (!room) {
        throw new Error('Room not found.');
    }
    return room;
};

exports.extendStay = async (bookingId, newDepartureDatetime) => {
    const booking = await receptionRepository.extendStay(bookingId, newDepartureDatetime);
    if (!booking) {
        throw new Error('Booking not found.');
    }
    logger.info(`Stay extended for booking ID: ${bookingId} until ${newDepartureDatetime}`);
    return booking;
};