const db = require('../db/db');

exports.getArrivalsByStates = async (states) => {
    const query = `
        SELECT b.booking_id, b.booking_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.room_type,
               u.full_name as applicant_name,
               (
                   SELECT string_agg(g.guest_name, ', ')
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guest_names
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_state = ANY($1)
        ORDER BY b.arrival_datetime ASC
    `;
    const result = await db.query(query, [states]);
    return result.rows;
};

exports.updateBookingState = async (bookingId, state, timestampField) => {
    const query = `
        UPDATE booking_requests 
        SET booking_state = $1, ${timestampField} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE booking_id = $2 RETURNING *
    `;
    const result = await db.query(query, [state, bookingId]);
    return result.rows[0];
};