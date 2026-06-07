export const getFormattedBookingId = (booking) => {
    if (!booking) return '';
    
    let bookingId = '';
    let formattedId = '';
    let roomIndex = null;
    
    if (typeof booking === 'object') {
        bookingId = booking.booking_id || booking.bookingId;
        formattedId = booking.formatted_id || booking.formattedId || '';
        if (booking.room_index !== undefined && booking.room_index !== null) {
            roomIndex = booking.room_index;
        } else if (booking.roomIndex !== undefined && booking.roomIndex !== null) {
            roomIndex = booking.roomIndex;
        }
    } else if (typeof booking === 'string') {
        bookingId = booking;
    }
    
    if (!bookingId) return '';
    
    // If formatted_id is missing (should not happen post-migration), fallback to shortId
    if (!formattedId) {
        formattedId = String(bookingId).substring(0, 8).toUpperCase();
    }
    
    if (roomIndex !== null) {
        return `${formattedId}:${roomIndex + 1}`;
    }
    
    return formattedId;
};
