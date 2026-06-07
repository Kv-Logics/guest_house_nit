const db = require('../db/db');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Front desk: today's expected arrivals, active check-ins, today's check-outs,
 * and in-house bookings awaiting extension approval (PENDING_* with checked_in_at set).
 */
exports.getFrontDeskBookings = async (overrideNow = null) => {
    const query = `
        SELECT b.booking_id, b.formatted_id, b.booking_seq, b.booking_state, b.arrival_datetime, b.departure_datetime,
               b.rooms_required, b.room_type, b.version, b.category_id, b.payment_state, b.allocated_room_numbers,
               u.full_name AS applicant_name,
               (
                   SELECT string_agg(g.guest_name, ', ')
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) AS guest_names,
               (
                   SELECT json_agg(row_to_json(g))
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) AS guests,
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
            )
            OR (b.booking_state = $3)
            OR (
                b.booking_state = $4
                AND b.checked_out_at IS NOT NULL
                AND (b.checked_out_at::date = COALESCE($7::date, CURRENT_DATE))
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
        overrideNow || null
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

exports.getRoomsWithStays = async (overrideNow = null) => {
    const now = overrideNow ? new Date(overrideNow) : new Date();

    // 1. Fetch all rooms
    const roomsRes = await db.query(`
        SELECT r.room_id, r.room_number, r.block_name, r.floor_number, r.room_type, r.capacity, r.has_ac, r.current_status
        FROM rooms r
        ORDER BY r.room_number ASC
    `);
    const rooms = roomsRes.rows;

    // 2. Fetch all active stays (with guest & booking departure times)
    const activeStaysRes = await db.query(`
        SELECT grs.stay_id, grs.booking_id, grs.guest_id, grs.room_id, grs.checked_in_at, grs.checked_out_at, grs.stay_status,
               grs.occupancy_type, grs.extra_bed, grs.operational_room_type, grs.operational_tariff, grs.operational_notes,
               g.guest_name, g.relation_to_applicant, g.arrival_datetime AS guest_arrival_datetime, g.departure_datetime AS guest_departure_datetime,
               u.full_name AS applicant_name, b.arrival_datetime, b.departure_datetime AS booking_departure_datetime, b.booking_state, b.pending_extension_datetime, b.payment_state, b.payment_responsible, b.category_id,
               (SELECT json_agg(row_to_json(fp)) FROM guest_food_preferences fp WHERE fp.guest_id = g.guest_id) as food_preferences
        FROM guest_room_stays grs
        JOIN guests g ON grs.guest_id = g.guest_id
        JOIN booking_requests b ON grs.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_state IN ('CHECKED_IN', 'PENDING_APPROVER', 'PENDING_ADMIN')
          AND b.checked_in_at IS NOT NULL
          AND b.checked_out_at IS NULL
          AND grs.stay_status = 'CHECKED_IN'
    `);
    const activeStays = activeStaysRes.rows;

    // 2b. Fetch pending guests who have pre-assigned rooms but haven't checked in yet
    const activeBookingsRes = await db.query(`
        SELECT b.booking_id, b.formatted_id, b.booking_seq, b.booking_state, b.arrival_datetime, b.departure_datetime AS booking_departure_datetime, b.allocated_room_numbers,
               u.full_name AS applicant_name
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'PENDING_APPROVER', 'PENDING_ADMIN')
          AND b.checked_out_at IS NULL
    `);
    const activeBookings = activeBookingsRes.rows;

    const bookingIds = activeBookings.map(b => b.booking_id);
    let guestsList = [];
    if (bookingIds.length > 0) {
        const guestsRes = await db.query(`
            SELECT g.guest_id, g.booking_id, g.guest_name, g.relation_to_applicant, g.room_index, g.preferred_occupancy, g.preferred_extra_bed,
                   g.arrival_datetime AS guest_arrival_datetime, g.departure_datetime AS guest_departure_datetime,
                   (SELECT stay_status FROM guest_room_stays grs WHERE grs.guest_id = g.guest_id AND grs.booking_id = g.booking_id LIMIT 1) AS stay_status,
                   (SELECT json_agg(row_to_json(fp)) FROM guest_food_preferences fp WHERE fp.guest_id = g.guest_id) as food_preferences
            FROM guests g
            WHERE g.booking_id = ANY($1)
        `, [bookingIds]);
        guestsList = guestsRes.rows;
    }

    const guestsByBooking = {};
    for (const g of guestsList) {
        if (!guestsByBooking[g.booking_id]) {
            guestsByBooking[g.booking_id] = [];
        }
        guestsByBooking[g.booking_id].push(g);
    }

    const pendingByRoom = {};
    for (const b of activeBookings) {
        const bGuests = guestsByBooking[b.booking_id] || [];
        if (bGuests.length === 0) continue;

        const uniqueRoomIndices = Array.from(new Set(bGuests.map(g => g.room_index !== null && g.room_index !== undefined ? g.room_index : 0))).sort((a, b) => a - b);
        const roomNumbers = (b.allocated_room_numbers || '').split(',').map(r => r.trim()).filter(Boolean);
        if (roomNumbers.length === 0) continue;

        for (const g of bGuests) {
            if (g.stay_status) {
                // already checked in or checked out
                continue;
            }
            const gRoomIndex = g.room_index !== null && g.room_index !== undefined ? g.room_index : 0;
            const mappedIdx = uniqueRoomIndices.indexOf(gRoomIndex);
            const roomNumber = roomNumbers[mappedIdx % roomNumbers.length];

            if (!pendingByRoom[roomNumber]) {
                pendingByRoom[roomNumber] = [];
            }

            pendingByRoom[roomNumber].push({
                guest_id: g.guest_id,
                guest_name: g.guest_name,
                relation: g.relation_to_applicant,
                room_index: g.room_index,
                preferred_occupancy: g.preferred_occupancy,
                preferred_extra_bed: g.preferred_extra_bed,
                booking_id: b.booking_id,
                applicant_name: b.applicant_name,
                arrival_datetime: g.guest_arrival_datetime || b.arrival_datetime,
                departure_datetime: g.guest_departure_datetime || b.booking_departure_datetime,
                booking_state: b.booking_state,
                food_preferences: g.food_preferences
            });
        }
    }

    // 3. Fetch past checkouts
    const pastStaysRes = await db.query(`
        SELECT grs.booking_id, grs.room_id, grs.checked_in_at, grs.checked_out_at,
               g.guest_name, u.full_name AS applicant_name
        FROM guest_room_stays grs
        JOIN guests g ON grs.guest_id = g.guest_id
        JOIN booking_requests b ON grs.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        WHERE grs.stay_status = 'CHECKED_OUT'
        ORDER BY grs.checked_out_at DESC
    `);
    const pastStays = pastStaysRes.rows;

    // 4. Fetch all active allocations (booking_rooms)
    const allocationsRes = await db.query(`
        SELECT br.room_id, br.allocated_from, br.allocated_to, u.full_name AS applicant_name, b.booking_id, b.is_bulk
        FROM booking_rooms br
        JOIN booking_requests b ON br.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_state NOT IN ('CHECKED_OUT', 'CANCELLED', 'REJECTED')
    `);
    const futureAllocations = allocationsRes.rows;

    return rooms.map(room => {
        // Find stays active in this room
        const roomActiveStays = activeStays.filter(s => s.room_id === room.room_id);
        
        let bookingDetails = null;
        if (roomActiveStays.length > 0) {
            const firstStay = roomActiveStays[0];
            const mappedGuests = roomActiveStays.map(s => {
                const departureTime = s.guest_departure_datetime || s.booking_departure_datetime;
                const isLate = departureTime ? (new Date(now) > new Date(departureTime)) : false;
                return {
                     guest_id: s.guest_id,
                     guest_name: s.guest_name,
                     relation: s.relation_to_applicant,
                     stay_id: s.stay_id,
                     occupancy_type: s.occupancy_type,
                     extra_bed: s.extra_bed,
                     operational_room_type: s.operational_room_type,
                     operational_tariff: s.operational_tariff,
                     operational_notes: s.operational_notes,
                     stay_status: s.stay_status,
                     checked_in_at: s.checked_in_at,
                     checked_out_at: s.checked_out_at,
                     is_late: isLate,
                     arrival_datetime: s.guest_arrival_datetime || s.arrival_datetime,
                     departure_datetime: departureTime,
                     food_preferences: s.food_preferences
                };
            });
            const roomIsLate = mappedGuests.some(g => g.is_late);

            bookingDetails = {
                booking_id: firstStay.booking_id,
                applicant_name: firstStay.applicant_name,
                arrival_datetime: firstStay.arrival_datetime,
                departure_datetime: firstStay.booking_departure_datetime,
                booking_state: firstStay.booking_state,
                pending_extension_datetime: firstStay.pending_extension_datetime,
                payment_state: firstStay.payment_state,
                payment_responsible: firstStay.payment_responsible,
                category_id: firstStay.category_id,
                guests: mappedGuests,
                is_late: roomIsLate
            };
        }

        // Find past stays history for this room
        const roomPastStays = pastStays.filter(s => s.room_id === room.room_id);
        
        // Group by booking_id
        const historyMap = {};
        for (const ps of roomPastStays) {
            if (!historyMap[ps.booking_id]) {
                historyMap[ps.booking_id] = {
                    booking_id: ps.booking_id,
                    guest_names: [],
                    checked_in_at: ps.checked_in_at,
                    checked_out_at: ps.checked_out_at
                };
            }
            historyMap[ps.booking_id].guest_names.push(ps.guest_name);
            if (new Date(ps.checked_in_at) < new Date(historyMap[ps.booking_id].checked_in_at)) {
                historyMap[ps.booking_id].checked_in_at = ps.checked_in_at;
            }
            if (new Date(ps.checked_out_at) > new Date(historyMap[ps.booking_id].checked_out_at)) {
                historyMap[ps.booking_id].checked_out_at = ps.checked_out_at;
            }
        }

        const history = Object.values(historyMap).map(h => ({
            booking_id: h.booking_id,
            guest_names: h.guest_names.join(', '),
            checked_in_at: h.checked_in_at,
            checked_out_at: h.checked_out_at
        })).sort((a, b) => new Date(b.checked_out_at) - new Date(a.checked_out_at));

        const roomPending = pendingByRoom[room.room_number] || [];
        const roomFutureAllocations = futureAllocations.filter(a => a.room_id === room.room_id);

        return {
            ...room,
            active_booking: bookingDetails,
            is_late: bookingDetails ? bookingDetails.is_late : false,
            pending_guests: roomPending,
            history: history,
            future_allocations: roomFutureAllocations
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

// =========================================================================
// PRODUCTION SAFETY STAYS & BILLING OPERATION REPOSITORY METHODS
// =========================================================================

const runQuery = (client, sql, params) => client ? client.query(sql, params) : db.query(sql, params);

exports.isRoomAvailable = async (roomId, client) => {
    const roomSql = `SELECT current_status FROM rooms WHERE room_id = $1`;
    const roomRes = await runQuery(client, roomSql, [roomId]);
    if (roomRes.rows.length === 0) return false;
    if (roomRes.rows[0].current_status !== 'available') return false;

    const staySql = `SELECT 1 FROM guest_room_stays WHERE room_id = $1 AND stay_status = 'CHECKED_IN' LIMIT 1`;
    const stayRes = await runQuery(client, staySql, [roomId]);
    return stayRes.rows.length === 0;
};

exports.insertGuestStay = async (stay, client) => {
    const sql = `
        INSERT INTO guest_room_stays (
            booking_id, guest_id, room_id, checked_in_at, occupancy_type, 
            extra_bed, operational_room_type, operational_tariff, stay_status, checked_in_by, operational_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
    `;
    const params = [
        stay.booking_id, stay.guest_id, stay.room_id, stay.checked_in_at, stay.occupancy_type || 'single',
        stay.extra_bed || false, stay.operational_room_type, stay.operational_tariff, 'CHECKED_IN', stay.checked_in_by, stay.operational_notes || null
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.updateGuestStayStatus = async (stayId, updateData, client) => {
    const sql = `
        UPDATE guest_room_stays
        SET stay_status = COALESCE($1, stay_status),
            checked_out_at = COALESCE($2, checked_out_at),
            checked_out_by = COALESCE($3, checked_out_by),
            room_id = COALESCE($4, room_id),
            occupancy_type = COALESCE($5, occupancy_type),
            extra_bed = COALESCE($6, extra_bed),
            operational_room_type = COALESCE($7, operational_room_type),
            operational_tariff = COALESCE($8, operational_tariff),
            operational_notes = COALESCE($9, operational_notes)
        WHERE stay_id = $10
        RETURNING *
    `;
    const params = [
        updateData.stay_status || null,
        updateData.checked_out_at || null,
        updateData.checked_out_by || null,
        updateData.room_id || null,
        updateData.occupancy_type || null,
        updateData.extra_bed !== undefined ? updateData.extra_bed : null,
        updateData.operational_room_type || null,
        updateData.operational_tariff || null,
        updateData.operational_notes || null,
        stayId
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.getActiveStaysByBooking = async (bookingId, client) => {
    const sql = `
        SELECT grs.*, r.room_number, g.guest_name, g.relation_to_applicant
        FROM guest_room_stays grs
        LEFT JOIN rooms r ON grs.room_id = r.room_id
        JOIN guests g ON grs.guest_id = g.guest_id
        WHERE grs.booking_id = $1 AND grs.stay_status = 'CHECKED_IN'
    `;
    const result = await runQuery(client, sql, [bookingId]);
    return result.rows;
};

exports.getStayById = async (stayId, client) => {
    const sql = `
        SELECT grs.*, r.room_number
        FROM guest_room_stays grs
        LEFT JOIN rooms r ON grs.room_id = r.room_id
        WHERE grs.stay_id = $1
    `;
    const result = await runQuery(client, sql, [stayId]);
    return result.rows[0];
};

exports.insertOccupancyHistory = async (oh, client) => {
    const sql = `
        INSERT INTO occupancy_history (
            booking_id, guest_id, room_id, occupancy_date, occupancy_type, 
            guest_count, extra_bed_count, room_type, tariff_amount, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;
    const params = [
        oh.booking_id, oh.guest_id, oh.room_id, oh.occupancy_date, oh.occupancy_type,
        oh.guest_count, oh.extra_bed_count, oh.room_type, oh.tariff_amount, oh.generated_by
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.insertRoomStatusHistory = async (rsh, client) => {
    const sql = `
        INSERT INTO room_status_history (
            room_id, previous_status, new_status, changed_by, remarks
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const params = [
        rsh.room_id, rsh.previous_status, rsh.new_status, rsh.changed_by, rsh.remarks
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.insertBillingOverrideLog = async (bol, client) => {
    const sql = `
        INSERT INTO billing_override_logs (
            booking_request_id, guest_id, previous_room_type, new_room_type,
            previous_occupancy, new_occupancy, previous_tariff, new_tariff,
            previous_extra_bed, new_extra_bed, override_reason, overridden_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
    `;
    const params = [
        bol.booking_request_id, bol.guest_id, bol.previous_room_type, bol.new_room_type,
        bol.previous_occupancy, bol.new_occupancy, bol.previous_tariff, bol.new_tariff,
        bol.previous_extra_bed, bol.new_extra_bed, bol.override_reason, bol.overridden_by
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.insertFinalBill = async (fb, client) => {
    const sql = `
        INSERT INTO final_bills (
            booking_id, generated_json, subtotal, gst, total, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (booking_id) DO UPDATE SET
            generated_json = EXCLUDED.generated_json,
            subtotal = EXCLUDED.subtotal,
            gst = EXCLUDED.gst,
            total = EXCLUDED.total,
            generated_by = EXCLUDED.generated_by,
            generated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;
    const params = [
        fb.booking_id, JSON.stringify(fb.generated_json), fb.subtotal, fb.gst, fb.total, fb.generated_by
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.getFinalBillByBooking = async (bookingId, client) => {
    const sql = `
        SELECT * FROM final_bills WHERE booking_id = $1
    `;
    const result = await runQuery(client, sql, [bookingId]);
    return result.rows[0];
};

exports.getBillingOverrideLogsByBooking = async (bookingId) => {
    const sql = `
        SELECT bol.*, g.guest_name, u.full_name AS overridden_by_name
        FROM billing_override_logs bol
        LEFT JOIN guests g ON bol.guest_id = g.guest_id
        JOIN users u ON bol.overridden_by = u.user_id
        WHERE bol.booking_request_id = $1
        ORDER BY bol.created_at DESC
    `;
    const result = await db.query(sql, [bookingId]);
    return result.rows;
};

exports.getRoomHistory = async (roomNumber, page, limit) => {
    const offset = (page - 1) * limit;
    const sql = `
        SELECT grs.stay_id, grs.booking_id, grs.guest_id, grs.room_id, grs.checked_in_at, grs.checked_out_at, grs.stay_status,
               grs.occupancy_type, grs.extra_bed, grs.operational_room_type, grs.operational_tariff, grs.operational_notes,
               g.guest_name, g.relation_to_applicant, g.arrival_datetime AS guest_arrival_datetime, g.departure_datetime AS guest_departure_datetime,
               u.full_name AS applicant_name, b.arrival_datetime, b.departure_datetime AS booking_departure_datetime, b.booking_state
        FROM guest_room_stays grs
        JOIN guests g ON grs.guest_id = g.guest_id
        JOIN booking_requests b ON grs.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        JOIN rooms r ON grs.room_id = r.room_id
        WHERE r.room_number = $1
          AND grs.stay_status = 'CHECKED_OUT'
        ORDER BY grs.checked_out_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(sql, [roomNumber, limit, offset]);
    return result.rows;
};

// --- NEW POS / BILLING & BULK ROOM LOGIC ---

exports.getInstitutionConfig = async (client) => {
    const sql = `SELECT * FROM institution_configs WHERE config_id = 1`;
    const result = await runQuery(client, sql, []);
    return result.rows[0];
};

exports.updateInstitutionConfig = async (payload, client = null) => {
    const sql = `
        UPDATE institution_configs
        SET legal_name = COALESCE($1, legal_name),
            gstin = COALESCE($2, gstin),
            pan = COALESCE($3, pan),
            address = COALESCE($4, address),
            signatory_name = COALESCE($5, signatory_name),
            signatory_designation = COALESCE($6, signatory_designation),
            invoice_prefix = COALESCE($7, invoice_prefix),
            sac_code = COALESCE($8, sac_code),
            updated_at = CURRENT_TIMESTAMP
        WHERE config_id = 1
        RETURNING *
    `;
    const params = [
        payload.legal_name, payload.gstin, payload.pan, payload.address,
        payload.signatory_name, payload.signatory_designation, payload.invoice_prefix, payload.sac_code
    ];
    const result = await db.query(sql, params);
    return result.rows[0];
};

exports.getLatestInvoiceSequence = async (prefix, client) => {
    // Acquire a transaction-level advisory lock based on the prefix hash to prevent race conditions
    await runQuery(client, `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, ['invoice_seq_' + prefix]);

    const sql = `
        SELECT invoice_number 
        FROM final_bills 
        WHERE invoice_number LIKE $1 
        ORDER BY invoice_number DESC 
        LIMIT 1
    `;
    const result = await runQuery(client, sql, [prefix + '%']);
    if (result.rows.length === 0) return 0;
    
    // Extract the sequence part assuming format PrefixXXXX
    const lastInvoice = result.rows[0].invoice_number;
    const seqStr = lastInvoice.replace(prefix, '');
    const seq = parseInt(seqStr, 10);
    return isNaN(seq) ? 0 : seq;
};

exports.confirmPayment = async (bookingId, paymentData, client) => {
    const sql = `
        UPDATE final_bills
        SET payment_mode = $1,
            amount_received = $2,
            transaction_ref = $3,
            received_by = $4,
            invoice_number = $5
        WHERE booking_id = $6
        RETURNING *
    `;
    const params = [
        paymentData.payment_mode, paymentData.amount_received, paymentData.transaction_ref,
        paymentData.received_by, paymentData.invoice_number, bookingId
    ];
    const result = await runQuery(client, sql, params);
    return result.rows[0];
};

exports.getPendingPayments = async (limit = 50, offset = 0, searchQuery = null, monthFilter = null, overrideNow = null) => {
    const referenceDate = overrideNow ? `'${overrideNow}'::timestamp` : 'CURRENT_DATE';
    
    let sql = `
        SELECT br.booking_id, br.formatted_id, br.booking_seq, br.arrival_datetime, br.departure_datetime, br.booking_state, 
               br.rooms_required, br.room_type, br.total_estimated_amount, br.category_id, br.payment_responsible,
               u.full_name as applicant_name,
               fb.subtotal, fb.gst, fb.total, fb.invoice_number, fb.payment_mode, fb.generated_json
        FROM booking_requests br
        LEFT JOIN final_bills fb ON br.booking_id = fb.booking_id
        LEFT JOIN users u ON br.user_id = u.user_id
        WHERE br.booking_state = 'CHECKED_OUT' AND br.payment_state != 'PAID'
    `;
    let countSql = `
        SELECT COUNT(*) as total_count
        FROM booking_requests br
        LEFT JOIN final_bills fb ON br.booking_id = fb.booking_id
        LEFT JOIN users u ON br.user_id = u.user_id
        WHERE br.booking_state = 'CHECKED_OUT' AND br.payment_state != 'PAID'
    `;
    const params = [];
    let paramCount = 1;

    if (searchQuery) {
        const searchClause = ` AND (u.full_name ILIKE $${paramCount} OR br.booking_id::text ILIKE $${paramCount} OR CAST(br.booking_seq AS text) ILIKE $${paramCount} OR fb.invoice_number ILIKE $${paramCount})`;
        sql += searchClause;
        countSql += searchClause;
        params.push(`%${searchQuery}%`);
        paramCount++;
    }

    if (monthFilter === 'archive') {
        const archiveClause = ` AND date_trunc('month', COALESCE(br.checked_out_at, br.departure_datetime)) < date_trunc('month', ${referenceDate})`;
        sql += archiveClause;
        countSql += archiveClause;
    } else {
        const currentMonthClause = ` AND date_trunc('month', COALESCE(br.checked_out_at, br.departure_datetime)) = date_trunc('month', ${referenceDate})`;
        sql += currentMonthClause;
        countSql += currentMonthClause;
    }

    sql += ` ORDER BY COALESCE(br.checked_out_at, br.departure_datetime) DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    
    const [result, countResult] = await Promise.all([
        db.query(sql, [...params, limit, offset]),
        db.query(countSql, params)
    ]);
    return {
        rows: result.rows,
        totalCount: parseInt(countResult.rows[0].total_count, 10)
    };
};

exports.getCompletedPayments = async (limit = 50, offset = 0, searchQuery = null, monthFilter = null, overrideNow = null) => {
    const referenceDate = overrideNow ? `'${overrideNow}'::timestamp` : 'CURRENT_DATE';
    
    let sql = `
        SELECT br.booking_id, br.formatted_id, br.booking_seq, br.arrival_datetime, br.departure_datetime, br.booking_state,
               br.rooms_required, br.room_type, br.total_estimated_amount, br.category_id, br.payment_responsible,
               u.full_name as applicant_name,
               fb.subtotal, fb.gst, fb.total, fb.invoice_number, fb.payment_mode, fb.generated_json,
               fb.amount_received, fb.transaction_ref, fb.generated_at as paid_at
        FROM booking_requests br
        JOIN final_bills fb ON br.booking_id = fb.booking_id
        LEFT JOIN users u ON br.user_id = u.user_id
        WHERE br.payment_state = 'PAID'
    `;
    let countSql = `
        SELECT COUNT(*) as total_count
        FROM booking_requests br
        JOIN final_bills fb ON br.booking_id = fb.booking_id
        LEFT JOIN users u ON br.user_id = u.user_id
        WHERE br.payment_state = 'PAID'
    `;
    const params = [];
    let paramCount = 1;

    if (searchQuery) {
        const searchClause = ` AND (u.full_name ILIKE $${paramCount} OR br.booking_id::text ILIKE $${paramCount} OR CAST(br.booking_seq AS text) ILIKE $${paramCount} OR fb.invoice_number ILIKE $${paramCount} OR fb.transaction_ref ILIKE $${paramCount})`;
        sql += searchClause;
        countSql += searchClause;
        params.push(`%${searchQuery}%`);
        paramCount++;
    }

    if (monthFilter === 'archive') {
        const archiveClause = ` AND date_trunc('month', br.updated_at) < date_trunc('month', ${referenceDate})`;
        sql += archiveClause;
        countSql += archiveClause;
    } else {
        const currentMonthClause = ` AND date_trunc('month', br.updated_at) = date_trunc('month', ${referenceDate})`;
        sql += currentMonthClause;
        countSql += currentMonthClause;
    }

    sql += ` ORDER BY br.updated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    const [result, countResult] = await Promise.all([
        db.query(sql, [...params, limit, offset]),
        db.query(countSql, params)
    ]);
    return {
        rows: result.rows,
        totalCount: parseInt(countResult.rows[0].total_count, 10)
    };
};

exports.getActiveBulkBlocks = async () => {
    const sql = `
        SELECT br.booking_id, br.arrival_datetime, br.departure_datetime, br.rooms_required, br.allocated_room_numbers,
               (
                   SELECT json_agg(row_to_json(r))
                   FROM booking_rooms br2
                   JOIN rooms r ON br2.room_id = r.room_id
                   WHERE br2.booking_id = br.booking_id
               ) as allocated_rooms
        FROM booking_requests br
        WHERE br.is_bulk = true AND br.booking_state NOT IN ('CHECKED_OUT', 'CANCELLED', 'NO_SHOW')
    `;
    const result = await db.query(sql);
    return result.rows;
};
