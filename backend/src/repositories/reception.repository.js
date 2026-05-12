const db = require('../db/db');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Front desk: today's expected arrivals, active check-ins, today's check-outs,
 * and in-house bookings awaiting extension approval (PENDING_* with checked_in_at set).
 */
exports.getFrontDeskBookings = async () => {
    const query = `
        SELECT b.booking_id, b.booking_state, b.arrival_datetime, b.departure_datetime,
               b.rooms_required, b.room_type, b.version, u.full_name AS applicant_name,
               (
                   SELECT string_agg(g.guest_name, ', ')
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) AS guest_names,
               (
                   b.checked_in_at IS NOT NULL
                   AND b.checked_out_at IS NULL
                   AND b.booking_state IN ($5, $6)
                   AND b.pending_extension_datetime IS NOT NULL
               ) AS is_extension_pending, b.checked_in_at, b.checked_out_at
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        WHERE (
            (
                b.booking_state IN ($1, $2)
                AND (b.arrival_datetime::date = CURRENT_DATE)
            )
            OR (b.booking_state = $3)
            OR (
                b.booking_state = $4
                AND b.checked_out_at IS NOT NULL
                AND (b.checked_out_at::date = CURRENT_DATE)
            )
            OR (
                b.booking_state IN ($5, $6)
                AND b.checked_in_at IS NOT NULL
                AND b.checked_out_at IS NULL
                AND b.pending_extension_datetime IS NOT NULL
            )
        )
        ORDER BY b.arrival_datetime ASC
    `;
    const params = [
        BOOKING_STATUS.ADMIN_APPROVED,
        BOOKING_STATUS.READY_FOR_CHECKIN,
        BOOKING_STATUS.CHECKED_IN,
        BOOKING_STATUS.CHECKED_OUT,
        BOOKING_STATUS.PENDING_APPROVER,
        BOOKING_STATUS.PENDING_ADMIN,
    ];
    const result = await db.query(query, params);
    return result.rows;
};

exports.checkInBooking = async (bookingId) => {
    const query = `
        UPDATE booking_requests
        SET booking_state = $1,
            checked_in_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
          AND booking_state IN ($3, $4)
        RETURNING *
    `;
    const result = await db.query(query, [
        BOOKING_STATUS.CHECKED_IN,
        bookingId,
        BOOKING_STATUS.ADMIN_APPROVED,
        BOOKING_STATUS.READY_FOR_CHECKIN,
    ]);
    return result.rows[0];
};

exports.checkOutBooking = async (bookingId) => {
    const query = `
        UPDATE booking_requests
        SET booking_state = $1,
            checked_out_at = CURRENT_TIMESTAMP,
            pending_extension_datetime = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
          AND (
              booking_state = $3 
              OR (booking_state IN ($4, $5) AND checked_in_at IS NOT NULL AND pending_extension_datetime IS NOT NULL)
          )
        RETURNING *
    `;
    const result = await db.query(query, [BOOKING_STATUS.CHECKED_OUT, bookingId, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.PENDING_APPROVER, BOOKING_STATUS.PENDING_ADMIN]);
    return result.rows[0];
};
