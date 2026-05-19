const db = require('../db/db');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Front desk: today's expected arrivals, active check-ins, today's check-outs,
 * and in-house bookings awaiting extension approval (PENDING_* with checked_in_at set).
 */
exports.getFrontDeskBookings = async () => {
    const query = `
        SELECT b.booking_id, b.booking_state, b.arrival_datetime, b.departure_datetime,
               b.rooms_required, b.room_type, b.version, b.category_id, b.payment_state, b.allocated_room_numbers,
               u.full_name AS applicant_name,
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

exports.checkInBooking = async (bookingId, allocatedRooms) => {
    const query = `
        UPDATE booking_requests
        SET booking_state = $1,
            checked_in_at = CURRENT_TIMESTAMP,
            allocated_room_numbers = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $3
          AND booking_state IN ($4, $5)
        RETURNING *
    `;
    const result = await db.query(query, [
        BOOKING_STATUS.CHECKED_IN,
        allocatedRooms || null,
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

exports.updateGuestTimes = async (guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime) => {
    const query = `
        UPDATE guests
        SET arrival_datetime = COALESCE($1, arrival_datetime),
            departure_datetime = COALESCE($2, departure_datetime),
            pending_extension_datetime = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE guest_id = $4
        RETURNING *
    `;
    const result = await db.query(query, [
        arrivalDatetime || null,
        departureDatetime || null,
        pendingExtensionDatetime || null,
        guestId
    ]);
    return result.rows[0];
};

exports.getRoomsWithStays = async () => {
    const roomsRes = await db.query(`
        SELECT r.room_id, r.room_number, r.block_name, r.floor_number, r.room_type, r.capacity, r.has_ac, r.current_status
        FROM rooms r
        ORDER BY r.room_number ASC
    `);
    const rooms = roomsRes.rows;

    const activeBookingsRes = await db.query(`
        SELECT b.booking_id, b.arrival_datetime, b.departure_datetime, b.room_type, b.extra_beds, b.allocated_room_numbers,
               u.full_name AS applicant_name
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        WHERE b.checked_in_at IS NOT NULL AND b.checked_out_at IS NULL
    `);
    const activeBookings = activeBookingsRes.rows;

    const activeBookingIds = activeBookings.map(b => b.booking_id);
    let activeGuests = [];
    if (activeBookingIds.length > 0) {
        const guestsRes = await db.query(`
            SELECT guest_id, booking_id, guest_name, relation_to_applicant, arrival_datetime, departure_datetime
            FROM guests
            WHERE booking_id = ANY($1)
        `, [activeBookingIds]);
        activeGuests = guestsRes.rows;
    }

    const pastBookingsRes = await db.query(`
        SELECT b.booking_id, b.checked_in_at, b.checked_out_at, b.allocated_room_numbers,
               (SELECT string_agg(g.guest_name, ', ') FROM guests g WHERE g.booking_id = b.booking_id) AS guest_names
        FROM booking_requests b
        WHERE b.booking_state = 'CHECKED_OUT' AND b.allocated_room_numbers IS NOT NULL
        ORDER BY b.checked_out_at DESC
    `);
    const pastBookings = pastBookingsRes.rows;

    return rooms.map(room => {
        const activeBooking = activeBookings.find(b => {
            if (!b.allocated_room_numbers) return false;
            const roomsList = b.allocated_room_numbers.split(',').map(rn => rn.trim());
            return roomsList.includes(room.room_number);
        });

        let bookingDetails = null;
        if (activeBooking) {
            const guestsInBooking = activeGuests.filter(g => g.booking_id === activeBooking.booking_id);
            bookingDetails = {
                booking_id: activeBooking.booking_id,
                applicant_name: activeBooking.applicant_name,
                arrival_datetime: activeBooking.arrival_datetime,
                departure_datetime: activeBooking.departure_datetime,
                extra_beds: activeBooking.extra_beds,
                guests: guestsInBooking.map(g => ({
                    guest_id: g.guest_id,
                    guest_name: g.guest_name,
                    relation: g.relation_to_applicant
                }))
            };
        }

        const history = pastBookings.filter(b => {
            const roomsList = b.allocated_room_numbers.split(',').map(rn => rn.trim());
            return roomsList.includes(room.room_number);
        }).map(h => ({
            booking_id: h.booking_id,
            guest_names: h.guest_names,
            checked_in_at: h.checked_in_at,
            checked_out_at: h.checked_out_at
        }));

        return {
            ...room,
            active_booking: bookingDetails,
            history: history
        };
    });
};

exports.updateRoomStatus = async (roomNumber, newStatus) => {
    const query = `
        UPDATE rooms
        SET current_status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_number = $2
        RETURNING *
    `;
    const result = await db.query(query, [newStatus, roomNumber]);
    return result.rows[0];
};

exports.extendStay = async (bookingId, newDepartureDatetime) => {
    const bookingQuery = `
        UPDATE booking_requests
        SET departure_datetime = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
        RETURNING *
    `;
    const bookingResult = await db.query(bookingQuery, [newDepartureDatetime, bookingId]);
    const updatedBooking = bookingResult.rows[0];

    if (!updatedBooking) return null;

    await db.query(`
        UPDATE guests
        SET departure_datetime = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
    `, [newDepartureDatetime, bookingId]);

    return updatedBooking;
};
