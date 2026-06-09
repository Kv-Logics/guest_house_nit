const receptionRepository = require('../repositories/reception.repository');
const db = require('../db/db');
const logger = require('../utils/logger');

const getCalendarDays = (start, end) => {
    if (!start || !end) return [];
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    
    // If end is before start, just return start day to ensure at least 1 day is billed
    if (e < s) {
        return [new Date(s)];
    }
    
    if (e.getTime() === s.getTime()) {
        e.setDate(e.getDate() + 1);
    }
    const days = [];
    let cur = new Date(s);
    while (cur < e) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
};

exports.getOccupancyStats = async () => {
    const client = await db.getClient();
    try {
        const roomsRes = await client.query('SELECT current_status FROM rooms');
        const rooms = roomsRes.rows;
        const totalRooms = rooms.length;
        const occupiedRooms = rooms.filter(r => r.current_status === 'occupied').length;
        const availableRooms = rooms.filter(r => r.current_status === 'available').length;
        
        const todayRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE date_trunc('day', arrival_datetime) = date_trunc('day', CURRENT_DATE)) as todays_arrivals,
                COUNT(*) FILTER (WHERE date_trunc('day', departure_datetime) = date_trunc('day', CURRENT_DATE)) as todays_departures,
                COUNT(*) FILTER (WHERE booking_state = 'READY_FOR_CHECKIN' AND date_trunc('day', arrival_datetime) < date_trunc('day', CURRENT_DATE)) as no_shows
            FROM booking_requests
            WHERE booking_state NOT IN ('CANCELLED', 'REJECTED', 'ADMIN_REJECTED', 'APPROVER_REJECTED')
        `);

        return {
            totalRooms,
            occupiedRooms,
            availableRooms,
            todaysArrivals: parseInt(todayRes.rows[0].todays_arrivals || 0, 10),
            todaysDepartures: parseInt(todayRes.rows[0].todays_departures || 0, 10),
            noShows: parseInt(todayRes.rows[0].no_shows || 0, 10)
        };
    } finally {
        client.release();
    }
};

exports.getTodayArrivals = async (overrideNow = null) => {
    return await receptionRepository.getFrontDeskBookings(overrideNow);
};

exports.assignRooms = async (bookingId, allocatedRoomsStr, assignedBy) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Get booking details
        const bRes = await client.query(`
            SELECT booking_id, arrival_datetime, departure_datetime, booking_state, rooms_required
            FROM booking_requests
            WHERE booking_id = $1 FOR UPDATE
        `, [bookingId]);
        
        if (bRes.rows.length === 0) {
            throw new Error('Booking request not found.');
        }
        
        const booking = bRes.rows[0];
        if (!['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN'].includes(booking.booking_state)) {
            throw new Error(`Rooms can only be assigned to approved bookings. Current state: ${booking.booking_state}`);
        }

        // 2. Split and fetch rooms
        const roomNumbers = (allocatedRoomsStr || '').split(',').map(rn => rn.trim()).filter(Boolean);
        if (roomNumbers.length === 0) {
            throw new Error('No rooms allocated.');
        }

        const roomsRes = await client.query(`
            SELECT room_id, room_number, room_type, capacity, current_status
            FROM rooms
            WHERE room_number = ANY($1)
        `, [roomNumbers]);

        if (roomsRes.rows.length !== roomNumbers.length) {
            throw new Error('Some of the allocated rooms do not exist in the database.');
        }

        const allocatedRooms = roomsRes.rows;

        // 3. Clear previous reservations in booking_rooms for this booking
        await client.query(`
            DELETE FROM booking_rooms WHERE booking_id = $1
        `, [bookingId]);

        /*
         * PRODUCTION RESERVATION ENGINE LOGIC:
         * Note that `rooms.current_status` tracks only the physical, real-time status of the room 
         * (e.g., 'available', 'occupied', 'cleaning', 'maintenance' right now).
         * Scheduling and future reservation overlaps are handled dynamically via the `booking_rooms` 
         * table using PostgreSQL `tsrange` exclusion constraints. Therefore, the room does not need 
         * to be set to a physical 'reserved' status inside the `rooms` table to prevent future conflicts.
         */
        // 4. Validate room availability in booking_rooms for this booking's date range
        for (const room of allocatedRooms) {
            const overlapRes = await client.query(`
                SELECT 1 FROM booking_rooms br
                JOIN booking_requests b_req ON br.booking_id = b_req.booking_id
                WHERE br.room_id = $1
                  AND br.booking_id != $2
                  AND b_req.booking_state NOT IN ('CHECKED_OUT', 'CANCELLED', 'REJECTED')
                  AND tsrange(br.allocated_from, br.allocated_to) && tsrange($3, $4)
                LIMIT 1
            `, [room.room_id, bookingId, booking.arrival_datetime, booking.departure_datetime]);
            
            if (overlapRes.rows.length > 0) {
                throw new Error(`Room ${room.room_number} is already reserved by another booking during this stay period.`);
            }
        }

        // 5. Insert reservations into booking_rooms and update physical status
        for (const room of allocatedRooms) {
            await client.query(`
                INSERT INTO booking_rooms (booking_id, room_id, allocated_from, allocated_to, allocation_status, allocated_by)
                VALUES ($1, $2, $3, $4, 'reserved', $5)
            `, [bookingId, room.room_id, booking.arrival_datetime, booking.departure_datetime, assignedBy || null]);

            await client.query(`
                UPDATE rooms
                SET current_status = 'reserved', updated_at = CURRENT_TIMESTAMP
                WHERE room_id = $1
            `, [room.room_id]);

            await client.query(`
                INSERT INTO room_status_history (room_id, previous_status, new_status, changed_by, remarks)
                VALUES ($1, $2, $3, $4, $5)
            `, [room.room_id, room.current_status, 'reserved', assignedBy || null, `Room assigned to booking ${bookingId.split('-')[0].toUpperCase()}`]);
        }

        // 6. Update booking request state and allocated_room_numbers
        let newState = booking.booking_state;
        if (newState === 'ADMIN_APPROVED') {
            newState = 'READY_FOR_CHECKIN';
        }

        const updateBookingQuery = `
            UPDATE booking_requests
            SET booking_state = $1,
                allocated_room_numbers = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $3
            RETURNING *
        `;
        const updatedBookingRes = await client.query(updateBookingQuery, [
            newState,
            allocatedRoomsStr,
            bookingId
        ]);

        await client.query('COMMIT');
        logger.info(`Rooms assigned and blocked successfully for booking: ${bookingId}`);
        return updatedBookingRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during assignRooms: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.checkInGuest = async (guestId, checkedInBy, overrideNow = null) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch guest
        const gRes = await client.query(`
            SELECT guest_id, booking_id, guest_name, relation_to_applicant, room_index, preferred_occupancy, preferred_extra_bed
            FROM guests
            WHERE guest_id = $1 FOR UPDATE
        `, [guestId]);

        if (gRes.rows.length === 0) {
            throw new Error('Guest not found.');
        }
        const guest = gRes.rows[0];

        // Check if guest is already checked in
        const stayCheckRes = await client.query(`
            SELECT 1 FROM guest_room_stays
            WHERE guest_id = $1 AND stay_status = 'CHECKED_IN'
            LIMIT 1
        `, [guestId]);
        if (stayCheckRes.rows.length > 0) {
            throw new Error('Guest is already checked in.');
        }

        // 2. Fetch booking details
        const bRes = await client.query(`
            SELECT booking_id, category_id, booking_state, allocated_room_numbers, arrival_datetime, departure_datetime
            FROM booking_requests
            WHERE booking_id = $1 FOR UPDATE
        `, [guest.booking_id]);

        if (bRes.rows.length === 0) {
            throw new Error('Booking request not found.');
        }
        const booking = bRes.rows[0];

        if (!['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN'].includes(booking.booking_state)) {
            throw new Error(`Booking cannot be checked in. Current state: ${booking.booking_state}`);
        }

        const roomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);
        if (roomNumbers.length === 0) {
            throw new Error('No rooms allocated to this booking. Please allocate rooms first.');
        }

        // Fetch all guests in the booking to map room_index correctly
        const allGuestsRes = await client.query(`
            SELECT guest_id, room_index
            FROM guests
            WHERE booking_id = $1
            ORDER BY guest_id ASC
        `, [booking.booking_id]);
        const allGuests = allGuestsRes.rows;

        // Get unique sorted room indices
        const uniqueRoomIndices = Array.from(new Set(allGuests.map(g => g.room_index !== null && g.room_index !== undefined ? g.room_index : 0))).sort((a, b) => a - b);
        const gRoomIndex = guest.room_index !== null && guest.room_index !== undefined ? guest.room_index : 0;
        const mappedIdx = uniqueRoomIndices.indexOf(gRoomIndex);
        const physicalRoomNumber = roomNumbers[mappedIdx % roomNumbers.length];

        // Fetch physical room details
        const roomRes = await client.query(`
            SELECT room_id, room_number, room_type, capacity, current_status
            FROM rooms
            WHERE room_number = $1 FOR UPDATE
        `, [physicalRoomNumber]);

        if (roomRes.rows.length === 0) {
            throw new Error(`Room ${physicalRoomNumber} not found.`);
        }
        const room = roomRes.rows[0];

        // Verify capacity
        const countRes = await client.query(`
            SELECT COUNT(*) as active_count
            FROM guest_room_stays
            WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
        `, [room.room_id]);
        const activeCount = Number(countRes.rows[0].active_count);

        if (activeCount + 1 > room.capacity + 1) {
            throw new Error(`Room ${room.room_number} capacity exceeded. Max capacity is ${room.capacity} plus 1 extra bed.`);
        }

        // Determine occupancy type and extra bed
        const occupancyType = guest.preferred_occupancy || (activeCount === 0 ? 'single' : 'double');
        const extraBed = guest.preferred_extra_bed !== null && guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : (activeCount >= room.capacity);

        // Fetch tariff
        const tariffRes = await client.query(`
            SELECT single_occupancy, double_occupancy, extra_bed
            FROM room_tariffs
            WHERE category_id = $1 AND room_type = $2
        `, [booking.category_id, room.room_type]);

        let operationalTariff = 0;
        if (tariffRes.rows.length > 0) {
            const t = tariffRes.rows[0];
            if (occupancyType === 'single') {
                operationalTariff = Number(t.single_occupancy);
            } else {
                operationalTariff = Number(t.double_occupancy) / 2;
            }
            if (extraBed) {
                operationalTariff += Number(t.extra_bed) || 400;
            }
        } else {
            // No tariff found — log a warning but do not block check-in
            // Billing will fall back to tariff table at payment time via calculateBookingBilling
            console.warn(`[TARIFF WARNING] No tariff found for category_id=${booking.category_id}, room_type=${room.room_type}. operational_tariff saved as 0; billing will use tariff table fallback.`);
        }

        const now = overrideNow ? new Date(overrideNow) : new Date();

        // Insert guest stay record
        const newStay = await receptionRepository.insertGuestStay({
            booking_id: booking.booking_id,
            guest_id: guest.guest_id,
            room_id: room.room_id,
            checked_in_at: now,
            occupancy_type: occupancyType,
            extra_bed: extraBed,
            operational_room_type: room.room_type,
            operational_tariff: operationalTariff,
            checked_in_by: checkedInBy || null,
            operational_notes: `Checked in individually to room ${room.room_number}`
        }, client);

        // Update room status to occupied
        await client.query(`
            UPDATE rooms
            SET current_status = 'occupied', updated_at = CURRENT_TIMESTAMP
            WHERE room_id = $1
        `, [room.room_id]);

        // Insert room status history
        await receptionRepository.insertRoomStatusHistory({
            room_id: room.room_id,
            previous_status: room.current_status,
            new_status: 'occupied',
            changed_by: checkedInBy || null,
            remarks: `Individual check-in of guest ${guest.guest_name}`
        }, client);

        // Update booking request state to CHECKED_IN
        await client.query(`
            UPDATE booking_requests
            SET booking_state = 'CHECKED_IN',
                checked_in_at = COALESCE(checked_in_at, $1),
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2
        `, [now, booking.booking_id]);

        await client.query('COMMIT');
        logger.info(`Guest ${guest.guest_name} checked in successfully to Room ${room.room_number}`);
        return newStay;

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during checkInGuest: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.checkIn = async (bookingId, allocatedRoomsStr, checkedInBy, overrideNow = null) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Get booking details
        const bRes = await client.query(`
            SELECT booking_id, category_id, room_type, booking_state, rooms_required, extra_beds
            FROM booking_requests
            WHERE booking_id = $1 FOR UPDATE
        `, [bookingId]);
        
        if (bRes.rows.length === 0) {
            throw new Error('Booking request not found.');
        }
        
        const booking = bRes.rows[0];
        if (!['ADMIN_APPROVED', 'READY_FOR_CHECKIN'].includes(booking.booking_state)) {
            throw new Error(`Booking cannot be checked in. Current state: ${booking.booking_state}`);
        }

        // 2. Split and fetch rooms
        const roomNumbers = (allocatedRoomsStr || '').split(',').map(rn => rn.trim()).filter(Boolean);
        if (roomNumbers.length === 0) {
            throw new Error('No rooms allocated.');
        }

        const roomsRes = await client.query(`
            SELECT room_id, room_number, room_type, capacity, current_status
            FROM rooms
            WHERE room_number = ANY($1)
        `, [roomNumbers]);

        if (roomsRes.rows.length !== roomNumbers.length) {
            throw new Error('Some of the allocated rooms do not exist in the database.');
        }

        const allocatedRooms = roomsRes.rows;

        // 3. Validation: Prevent Double Room Allocation (Rule 1)
        for (const room of allocatedRooms) {
            const isAvail = await receptionRepository.isRoomAvailable(room.room_id, client);
            if (!isAvail) {
                throw new Error(`Room ${room.room_number} is not available for check-in.`);
            }
        }

        // 4. Fetch guests for this booking
        const guestsRes = await client.query(`
            SELECT guest_id, guest_name, relation_to_applicant, room_index, preferred_occupancy, preferred_extra_bed
            FROM guests
            WHERE booking_id = $1
        `, [bookingId]);

        const guests = guestsRes.rows;
        if (guests.length === 0) {
            throw new Error('No guests associated with this booking.');
        }

        // 5. Distribute guests into allocated rooms based on room_index
        const uniqueRoomIndices = Array.from(new Set(guests.map(g => g.room_index !== null && g.room_index !== undefined ? g.room_index : 0))).sort((a, b) => a - b);
        
        const guestsPerRoom = {}; // roomId -> array of guests
        for (const guest of guests) {
            const gRoomIndex = guest.room_index !== null && guest.room_index !== undefined ? guest.room_index : 0;
            const mappedIdx = uniqueRoomIndices.indexOf(gRoomIndex);
            const physicalRoom = allocatedRooms[mappedIdx % allocatedRooms.length];
            if (!guestsPerRoom[physicalRoom.room_id]) {
                guestsPerRoom[physicalRoom.room_id] = [];
            }
            guestsPerRoom[physicalRoom.room_id].push(guest);
        }

        // 6. Validate occupancy capacity (Rule 5) and insert stay records
        const now = overrideNow ? new Date(overrideNow) : new Date();
        for (const room of allocatedRooms) {
            const roomGuests = guestsPerRoom[room.room_id] || [];
            const guestCount = roomGuests.length;
            
            // Check capacity + extra bed limit
            if (guestCount > room.capacity + 1) {
                throw new Error(`Room ${room.room_number} capacity exceeded. Capacity is ${room.capacity} plus 1 extra bed.`);
            }

            // Insert stays for guests in this room
            let idx = 0;
            for (const guest of roomGuests) {
                const occupancyType = guest.preferred_occupancy || (guestCount === 1 ? 'single' : 'double');
                const extraBed = guest.preferred_extra_bed !== null && guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : (idx >= room.capacity);
                
                // Get tariff
                const tariffRes = await client.query(`
                    SELECT single_occupancy, double_occupancy, extra_bed
                    FROM room_tariffs
                    WHERE category_id = $1 AND room_type = $2
                `, [booking.category_id, room.room_type]);

                let operationalTariff = 0;
                if (tariffRes.rows.length > 0) {
                    const t = tariffRes.rows[0];
                    if (occupancyType === 'single') {
                        operationalTariff = Number(t.single_occupancy);
                    } else {
                        operationalTariff = Number(t.double_occupancy) / 2;
                    }
                    if (extraBed) {
                        operationalTariff += Number(t.extra_bed) || 400;
                    }
                }

                // Insert stay
                await receptionRepository.insertGuestStay({
                    booking_id: bookingId,
                    guest_id: guest.guest_id,
                    room_id: room.room_id,
                    checked_in_at: now,
                    occupancy_type: occupancyType,
                    extra_bed: extraBed,
                    operational_room_type: room.room_type,
                    operational_tariff: operationalTariff,
                    checked_in_by: checkedInBy || null,
                    operational_notes: `Checked in to room ${room.room_number}`
                }, client);

                idx++;
            }

            // Update room status to occupied
            await client.query(`
                UPDATE rooms
                SET current_status = 'occupied', updated_at = CURRENT_TIMESTAMP
                WHERE room_id = $1
            `, [room.room_id]);

            // Insert room status history
            await receptionRepository.insertRoomStatusHistory({
                room_id: room.room_id,
                previous_status: room.current_status,
                new_status: 'occupied',
                changed_by: checkedInBy || null,
                remarks: `Check-in for booking ${bookingId.split('-')[0].toUpperCase()}`
            }, client);
        }

        // 7. Update booking request state
        const updateBookingQuery = `
            UPDATE booking_requests
            SET booking_state = $1,
                checked_in_at = $2,
                allocated_room_numbers = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $4
            RETURNING *
        `;
        const updatedBookingRes = await client.query(updateBookingQuery, [
            'CHECKED_IN',
            now,
            allocatedRoomsStr,
            bookingId
        ]);

        await client.query('COMMIT');
        logger.info(`Check-in completed successfully for booking: ${bookingId}`);
        return updatedBookingRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during check-in: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.checkOut = async (bookingId, checkedOutBy, overrideNow = null, payload = null) => {
    // 0. Pre-check and generate bill if guest-responsible and bill not present
    const stayInfo = await db.query(
        `SELECT payment_responsible, category_id FROM booking_requests WHERE booking_id = $1`,
        [bookingId]
    );
    if (stayInfo.rows.length > 0) {
        const paymentResponsible = stayInfo.rows[0].payment_responsible;
        const categoryId = stayInfo.rows[0].category_id;
        if (paymentResponsible === 'guest' && categoryId !== 1) {
            const billCheck = await db.query('SELECT * FROM final_bills WHERE booking_id = $1', [bookingId]);
            if (billCheck.rows.length === 0) {
                const billing = await exports.calculateBookingBilling(bookingId, null, overrideNow);
                await db.query(`
                    INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, generated_by)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [bookingId, JSON.stringify(billing.breakdown), billing.subtotal, billing.gst, billing.total, checkedOutBy]);
            }
        }
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Lock the booking request (Prevent concurrent checkouts - Soft Lock Rule 4)
        const bRes = await client.query(`
            SELECT booking_id, booking_state, allocated_room_numbers, checked_in_at, category_id, payment_state, payment_responsible
            FROM booking_requests
            WHERE booking_id = $1 FOR UPDATE
        `, [bookingId]);

        if (bRes.rows.length === 0) {
            throw new Error('Booking request not found.');
        }

        const booking = bRes.rows[0];
        if (booking.booking_state === 'CHECKED_OUT') {
            throw new Error('Booking has already been checked out.');
        }

        // --- PAYMENT GATE ENFORCEMENT ---
        // (Removed to allow check-out without prior payment. Payment collected via Reception Payments Tab)
        const ADMIN_ROLES = ['super_admin', 'guest_house_admin'];
        const isForceCheckout = payload?.force === true && ADMIN_ROLES.includes(payload?.userRole);

        // If force checkout by admin — write override log entry (skip for category 1)
        if (isForceCheckout && booking.category_id !== 1) {
            await client.query(
                `INSERT INTO billing_override_logs 
                  (booking_request_id, override_reason, overridden_by)
                 VALUES ($1, $2, $3)`,
                [
                    bookingId,
                    `FORCE CHECKOUT: ${payload.forceReason || 'No reason provided'}`,
                    payload.userId || checkedOutBy
                ]
            );

            // Delete stale PDF so it regenerates
            const fs = require('fs');
            const path = require('path');
            const stalePdfPath = path.join(process.cwd(), 'uploads/invoices', `${bookingId}.pdf`);
            if (fs.existsSync(stalePdfPath)) {
                fs.unlinkSync(stalePdfPath);
            }
        }

        // 2. Fetch and lock active stays for this booking
        const staysRes = await client.query(`
            SELECT grs.*, r.room_number, r.current_status, g.guest_name
            FROM guest_room_stays grs
            JOIN rooms r ON grs.room_id = r.room_id
            JOIN guests g ON grs.guest_id = g.guest_id
            WHERE grs.booking_id = $1 AND grs.stay_status = 'CHECKED_IN' FOR UPDATE
        `, [bookingId]);

        const activeStays = staysRes.rows;
        if (activeStays.length === 0) {
            throw new Error('No active stays found for this booking.');
        }

        const now = overrideNow ? new Date(overrideNow) : new Date();

        // 3. For each active stay: close it, write to occupancy_history (skip for category 1), and update room status
        const roomsToClean = new Set();

        for (const stay of activeStays) {
            // Close stay
            await receptionRepository.updateGuestStayStatus(stay.stay_id, {
                stay_status: 'CHECKED_OUT',
                checked_out_at: now,
                checked_out_by: checkedOutBy || null
            }, client);

            // Populating occupancy_history day-by-day (Rule 6 / Rule 10) (skip for category 1)
            if (booking.category_id !== 1) {
                const days = getCalendarDays(stay.checked_in_at, now);
                for (const day of days) {
                    await receptionRepository.insertOccupancyHistory({
                        booking_id: bookingId,
                        guest_id: stay.guest_id,
                        room_id: stay.room_id,
                        occupancy_date: day,
                        occupancy_type: stay.occupancy_type,
                        guest_count: stay.occupancy_type === 'single' ? 1 : 2,
                        extra_bed_count: stay.extra_bed ? 1 : 0,
                        room_type: stay.operational_room_type,
                        tariff_amount: stay.operational_tariff,
                        generated_by: checkedOutBy || null
                    }, client);
                }
            }

            roomsToClean.add(JSON.stringify({ room_id: stay.room_id, room_number: stay.room_number, current_status: stay.current_status }));
        }

        // Update rooms status to cleaning if no other active stay exists in those rooms
        for (const roomStr of roomsToClean) {
            const room = JSON.parse(roomStr);
            const otherStaysRes = await client.query(`
                SELECT 1 FROM guest_room_stays
                WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
                LIMIT 1
            `, [room.room_id]);

            if (otherStaysRes.rows.length === 0) {
                // Change room status to cleaning
                await client.query(`
                    UPDATE rooms
                    SET current_status = 'cleaning', updated_at = CURRENT_TIMESTAMP
                    WHERE room_id = $1
                `, [room.room_id]);

                // Insert room status history
                await receptionRepository.insertRoomStatusHistory({
                    room_id: room.room_id,
                    previous_status: room.current_status,
                    new_status: 'cleaning',
                    changed_by: checkedOutBy || null,
                    remarks: `Checkout for booking ${bookingId.split('-')[0].toUpperCase()}`
                }, client);
            }
        }

        // 4. Calculate final billing dynamically
        const billing = await exports.calculateBookingBilling(bookingId, client);

        // 5. Generate final bill snapshot (Rule 3) (skip for category 1)
        if (booking.category_id !== 1) {
            await receptionRepository.insertFinalBill({
                booking_id: bookingId,
                generated_json: billing.breakdown,
                subtotal: billing.subtotal,
                gst: billing.gst,
                total: billing.total,
                billing_type: payload?.billing_type || 'B2C',
                company_name: payload?.company_name || null,
                gstin: payload?.gstin || null,
                company_address: payload?.company_address || null,
                generated_by: checkedOutBy || null
            }, client);
        }

        // Free up the booking_rooms allocation to the current time so it doesn't block future assignments
        await client.query(`
            UPDATE booking_rooms
            SET allocated_to = $1
            WHERE booking_id = $2
        `, [now, bookingId]);

        // 6. Update booking request state & total amount (Rule 9: booking table sync)
        const updateBookingQuery = `
            UPDATE booking_requests
            SET booking_state = $1,
                checked_out_at = $2,
                total_estimated_amount = $3,
                payment_state = CASE WHEN category_id = 1 THEN 'PAID'::varchar ELSE payment_state END,
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $4
            RETURNING *
        `;
        const updatedBookingRes = await client.query(updateBookingQuery, [
            'CHECKED_OUT',
            now,
            booking.category_id === 1 ? 0 : billing.total,
            bookingId
        ]);

        await client.query('COMMIT');
        logger.info(`Check-out completed successfully for booking: ${bookingId}`);
        return updatedBookingRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during checkout: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.checkOutStay = async (stayId, checkedOutBy, overrideNow = null, payload = null) => {
    // 0. Precheck and generate bill if guest-responsible and bill not present
    const stayInfo = await db.query(
        `SELECT b.booking_id, b.payment_responsible, b.payment_state, b.category_id
         FROM guest_room_stays grs
         JOIN booking_requests b ON grs.booking_id = b.booking_id
         WHERE grs.stay_id = $1`,
        [stayId]
    );
    if (stayInfo.rows.length > 0) {
        const bookingId = stayInfo.rows[0].booking_id;
        const paymentResponsible = stayInfo.rows[0].payment_responsible;
        const categoryId = stayInfo.rows[0].category_id;
        
        // Check if there are other checked-in stays for this booking
        const otherStaysCheck = await db.query(
            `SELECT COUNT(*) as active_count FROM guest_room_stays WHERE booking_id = $1 AND stay_status = 'CHECKED_IN' AND stay_id != $2`, 
            [bookingId, stayId]
        );
        const otherActiveStaysCount = Number(otherStaysCheck.rows[0].active_count);

        if (paymentResponsible === 'guest' && otherActiveStaysCount === 0 && categoryId !== 1) {
            const billCheck = await db.query('SELECT * FROM final_bills WHERE booking_id = $1', [bookingId]);
            if (billCheck.rows.length === 0) {
                const billing = await exports.calculateBookingBilling(bookingId, null, overrideNow);
                await db.query(`
                    INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, billing_type, company_name, gstin, company_address, generated_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [bookingId, JSON.stringify(billing.breakdown), billing.subtotal, billing.gst, billing.total,
                    payload?.billing_type || 'B2C', payload?.company_name || null, payload?.gstin || null, payload?.company_address || null, checkedOutBy]);
            }
        }
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch and lock the stay
        const stayRes = await client.query(`
            SELECT grs.*, r.room_number, r.current_status, g.guest_name, b.category_id, b.payment_state, b.payment_responsible
            FROM guest_room_stays grs
            JOIN rooms r ON grs.room_id = r.room_id
            JOIN guests g ON grs.guest_id = g.guest_id
            JOIN booking_requests b ON grs.booking_id = b.booking_id
            WHERE grs.stay_id = $1 FOR UPDATE
        `, [stayId]);

        if (stayRes.rows.length === 0) {
            throw new Error('Active stay not found.');
        }

        const stay = stayRes.rows[0];
        if (stay.stay_status === 'CHECKED_OUT') {
            throw new Error('This guest has already been checked out.');
        }

        // --- PAYMENT GATE ENFORCEMENT ---
        // (Removed to allow check-out without prior payment. Payment collected via Reception Payments Tab)
        const ADMIN_ROLES = ['super_admin', 'guest_house_admin'];
        const isForceCheckout = payload?.force === true && ADMIN_ROLES.includes(payload?.userRole);
        const bookingId = stay.booking_id;

        const otherStaysRes = await client.query(`
            SELECT COUNT(*) as active_count
            FROM guest_room_stays
            WHERE booking_id = $1 AND stay_status = 'CHECKED_IN' AND stay_id != $2
        `, [bookingId, stayId]);
        const otherActiveStaysCount = Number(otherStaysRes.rows[0].active_count);

        // If force checkout by admin — write override log entry (skip for category 1)
        if (isForceCheckout && stay.category_id !== 1) {
            await client.query(
                `INSERT INTO billing_override_logs 
                  (booking_request_id, override_reason, overridden_by)
                 VALUES ($1, $2, $3)`,
                [
                    bookingId,
                    `FORCE CHECKOUT: ${payload.forceReason || 'No reason provided'}`,
                    payload.userId || checkedOutBy
                ]
            );

            // Delete stale PDF so it regenerates
            const fs = require('fs');
            const path = require('path');
            const stalePdfPath = path.join(process.cwd(), 'uploads/invoices', `${bookingId}.pdf`);
            if (fs.existsSync(stalePdfPath)) {
                fs.unlinkSync(stalePdfPath);
            }
        }

        // 2. Rule 7: check if final bill exists
        const finalBill = await receptionRepository.getFinalBillByBooking(bookingId, client);
        if (finalBill && !isForceCheckout && stay.category_id !== 1) {
            if (finalBill.payment_mode === null && stay.payment_responsible === 'guest' && otherActiveStaysCount === 0) {
                throw new Error('This stay cannot be checked out because the final bill has been generated but is unpaid.');
            }
        }

        const now = overrideNow ? new Date(overrideNow) : new Date();

        // 3. Close the stay
        await receptionRepository.updateGuestStayStatus(stay.stay_id, {
            stay_status: 'CHECKED_OUT',
            checked_out_at: now,
            checked_out_by: checkedOutBy || null
        }, client);

        // 4. Populating occupancy_history day-by-day (Rule 6 / Rule 10) (skip for category 1)
        if (stay.category_id !== 1) {
            const days = getCalendarDays(stay.checked_in_at, now);
            for (const day of days) {
                await receptionRepository.insertOccupancyHistory({
                    booking_id: bookingId,
                    guest_id: stay.guest_id,
                    room_id: stay.room_id,
                    occupancy_date: day,
                    occupancy_type: stay.occupancy_type,
                    guest_count: stay.occupancy_type === 'single' ? 1 : 2,
                    extra_bed_count: stay.extra_bed ? 1 : 0,
                    room_type: stay.operational_room_type,
                    tariff_amount: stay.operational_tariff,
                    generated_by: checkedOutBy || null
                }, client);
            }
        }

        // 5. Update room status to cleaning if no other active stay exists in this room
        const roomRemainingStaysRes = await client.query(`
            SELECT 1 FROM guest_room_stays
            WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
            LIMIT 1
        `, [stay.room_id]);

        if (roomRemainingStaysRes.rows.length === 0) {
            // Change room status to cleaning
            await client.query(`
                UPDATE rooms
                SET current_status = 'cleaning', updated_at = CURRENT_TIMESTAMP
                WHERE room_id = $1
            `, [stay.room_id]);

            // Insert room status history
            await receptionRepository.insertRoomStatusHistory({
                room_id: stay.room_id,
                previous_status: stay.current_status,
                new_status: 'cleaning',
                changed_by: checkedOutBy || null,
                remarks: `Checkout for guest ${stay.guest_name}`
            }, client);
        }

        // 6. Check if any other active stays exist for the entire booking
        const activeBookingStaysRes = await client.query(`
            SELECT 1 FROM guest_room_stays
            WHERE booking_id = $1 AND stay_status = 'CHECKED_IN'
            LIMIT 1
        `, [bookingId]);

        let bookingFinished = false;
        let updatedBooking = null;

        if (activeBookingStaysRes.rows.length === 0) {
            // Check if there are guests in this booking who haven't checked in yet and whose scheduled departure date is in the future
            const pendingGuestsRes = await client.query(`
                SELECT g.guest_id, COALESCE(g.departure_datetime, b.departure_datetime) as dep_time
                FROM guests g
                JOIN booking_requests b ON g.booking_id = b.booking_id
                WHERE g.booking_id = $1
                  AND NOT EXISTS (
                      SELECT 1 FROM guest_room_stays grs
                      WHERE grs.guest_id = g.guest_id AND grs.booking_id = g.booking_id
                  )
            `, [bookingId]);

            let hasFuturePendingGuest = false;
            for (const row of pendingGuestsRes.rows) {
                const departureTime = new Date(row.dep_time);
                if (now < departureTime) {
                    hasFuturePendingGuest = true;
                    break;
                }
            }

            if (!hasFuturePendingGuest) {
                bookingFinished = true;
                
                // Calculate final billing dynamically
                const billing = await exports.calculateBookingBilling(bookingId, client, overrideNow);

                // Generate final bill snapshot (Rule 3) (skip for category 1)
                if (stay.category_id !== 1) {
                    await receptionRepository.insertFinalBill({
                        booking_id: bookingId,
                        generated_json: billing.breakdown,
                        subtotal: billing.subtotal,
                        gst: billing.gst,
                        total: billing.total,
                        billing_type: payload?.billing_type || 'B2C',
                        company_name: payload?.company_name || null,
                        gstin: payload?.gstin || null,
                        company_address: payload?.company_address || null,
                        generated_by: checkedOutBy || null
                    }, client);
                }

                // Free up the booking_rooms allocation to the current time so it doesn't block future assignments
                await client.query(`
                    UPDATE booking_rooms
                    SET allocated_to = $1
                    WHERE booking_id = $2
                `, [now, bookingId]);

                // Update booking request state & total amount (Rule 9: booking table sync)
                const updateBookingQuery = `
                    UPDATE booking_requests
                    SET booking_state = $1,
                        checked_out_at = $2,
                        total_estimated_amount = $3,
                        payment_state = CASE WHEN category_id = 1 THEN 'PAID'::varchar ELSE payment_state END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE booking_id = $4
                    RETURNING *
                `;
                const updatedBookingRes = await client.query(updateBookingQuery, [
                    'CHECKED_OUT',
                    now,
                    stay.category_id === 1 ? 0 : billing.total,
                    bookingId
                ]);
                updatedBooking = updatedBookingRes.rows[0];
            }
        }

        await client.query('COMMIT');
        logger.info(`Check-out completed for guest ${stay.guest_name} (stay: ${stayId})`);
        
        return {
            checkedOutStayId: stayId,
            bookingFinished,
            booking: updatedBooking
        };

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during guest stay checkout: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.updateGuestTimes = async (guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime) => {
    const guest = await receptionRepository.updateGuestTimes(guestId, arrivalDatetime, departureDatetime, pendingExtensionDatetime);
    if (!guest) {
        throw new Error('Guest not found.');
    }
    logger.info(`Updated check-in/out times for guest ID: ${guestId}`);
    return guest;
};

exports.getRoomsWithStays = async (overrideNow = null) => {
    return await receptionRepository.getRoomsWithStays(overrideNow);
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

exports.calculateBookingBilling = async (bookingId, client, overrideNow = null) => {
    // If it's category 1, no payment, no bill
    const catCheck = await (client || db).query(`SELECT category_id FROM booking_requests WHERE booking_id = $1`, [bookingId]);
    if (catCheck.rows.length > 0 && catCheck.rows[0].category_id === 1) {
        return {
            subtotal: 0,
            gst: 0,
            cgst: 0,
            sgst: 0,
            total: 0,
            isFinal: false,
            breakdown: {
                roomDaysBreakdown: [],
                subtotal: 0,
                cgst: 0,
                sgst: 0,
                total: 0
            }
        };
    }

    // 1. Check if final bill exists
    const finalBill = await receptionRepository.getFinalBillByBooking(bookingId, client);
    if (finalBill) {
        return {
            subtotal: Number(finalBill.subtotal),
            gst: Number(finalBill.gst),
            total: Number(finalBill.total),
            isFinal: true,
            breakdown: finalBill.generated_json
        };
    }

    // 2. Fetch all stays (including checked out ones)
    const allStaysRes = await (client || db).query(`
        SELECT grs.*, r.room_number, g.guest_name
        FROM guest_room_stays grs
        LEFT JOIN rooms r ON grs.room_id = r.room_id
        JOIN guests g ON grs.guest_id = g.guest_id
        WHERE grs.booking_id = $1
    `, [bookingId]);
    const allStays = allStaysRes.rows;

    if (allStays.length === 0) {
        // Fallback to estimated booking amount
        const bRes = await (client || db).query(`SELECT total_estimated_amount FROM booking_requests WHERE booking_id = $1`, [bookingId]);
        const total = bRes.rows[0] ? Number(bRes.rows[0].total_estimated_amount) : 0;
        const subtotal = Math.round(total / 1.12);
        return {
            subtotal,
            gst: total - subtotal,
            total,
            isFinal: false,
            breakdown: null
        };
    }

    // Load tariff table for this booking's category as a fallback
    // This ensures billing always has a price even if operational_tariff was saved as 0
    const bookingCatRes = await (client || db).query(
        `SELECT b.category_id, rt.room_type, rt.single_occupancy, rt.double_occupancy, rt.extra_bed
         FROM booking_requests b
         JOIN room_tariffs rt ON rt.category_id = b.category_id
         WHERE b.booking_id = $1`,
        [bookingId]
    );
    // Build map: room_type -> { single, double, extra_bed }
    const tariffLookup = {};
    for (const row of bookingCatRes.rows) {
        tariffLookup[row.room_type] = {
            single: Number(row.single_occupancy),
            double: Number(row.double_occupancy),
            extra_bed: Number(row.extra_bed) || 400
        };
    }

    // Find all occupied rooms in these stays
    const roomsMap = {};
    for (const s of allStays) {
        if (s.room_id) {
            roomsMap[s.room_id] = s.room_number;
        }
    }

    // For each stay, get its calendar days
    const dailyOccupancy = {};
    for (const s of allStays) {
        const checkIn = s.checked_in_at;
        const checkOut = s.checked_out_at || (overrideNow ? new Date(overrideNow) : new Date());
        const days = getCalendarDays(checkIn, checkOut);
        for (const day of days) {
            const dayStr = day.toISOString().split('T')[0];
            if (!dailyOccupancy[dayStr]) {
                dailyOccupancy[dayStr] = {};
            }
            if (!dailyOccupancy[dayStr][s.room_id]) {
                dailyOccupancy[dayStr][s.room_id] = [];
            }
            dailyOccupancy[dayStr][s.room_id].push(s);
        }
    }

    let subtotal = 0;
    const roomDaysBreakdown = [];

    // Calculate room-centric cost day-by-day
    for (const dayStr of Object.keys(dailyOccupancy).sort()) {
        const roomsActive = dailyOccupancy[dayStr];
        for (const roomId of Object.keys(roomsActive)) {
            const staysOnDay = roomsActive[roomId];
            const roomNumber = roomsMap[roomId];
            const guestCount = staysOnDay.length;
            if (guestCount === 0) continue;

            let roomDayCost = 0;
            const guestBreakdowns = [];
            for (const s of staysOnDay) {
                let guestTariff = Number(s.operational_tariff);

                // If operational_tariff was never set or is 0, fall back to tariff table
                if (!guestTariff || guestTariff === 0) {
                    const roomType = s.operational_room_type || 'Standard Room';
                    const tariff = tariffLookup[roomType];
                    const occupancy = s.occupancy_type || 'single';
                    if (tariff) {
                        guestTariff = occupancy === 'single' ? tariff.single : tariff.double / 2;
                        if (s.extra_bed) guestTariff += tariff.extra_bed;
                    } else {
                        // Hard fallback if tariff table is missing a row for this category
                        guestTariff = occupancy === 'single' ? 1000 : 800;
                        if (s.extra_bed) guestTariff += 400;
                    }
                }

                roomDayCost += guestTariff;
                guestBreakdowns.push({
                    guest_id: s.guest_id,
                    guest_name: s.guest_name,
                    extra_bed: s.extra_bed,
                    tariff: guestTariff
                });
            }

            subtotal += roomDayCost;
            roomDaysBreakdown.push({
                date: dayStr,
                room_id: roomId,
                room_number: roomNumber,
                cost: roomDayCost,
                guests: guestBreakdowns
            });
        }
    }

    const cgst = Math.round(subtotal * 0.06);
    const sgst = Math.round(subtotal * 0.06);
    const total = subtotal + cgst + sgst;

    return {
        subtotal,
        gst: cgst + sgst,
        cgst,
        sgst,
        total,
        isFinal: false,
        breakdown: {
            roomDaysBreakdown,
            subtotal,
            cgst,
            sgst,
            total
        }
    };
};

exports.roomTransfer = async (stayId, newRoomNumber, transferredBy, remarks, isGroup = false, overrideNow = null) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch the active stay
        const stay = await receptionRepository.getStayById(stayId, client);
        if (!stay || stay.stay_status !== 'CHECKED_IN') {
            throw new Error('Active stay not found.');
        }

        // 2. Rule 7: check if final bill exists
        const finalBill = await receptionRepository.getFinalBillByBooking(stay.booking_id, client);
        if (finalBill) {
            throw new Error('Stay cannot be modified because the final bill has already been generated.');
        }

        const sourceRoomId = stay.room_id;

        // Fetch all active stays in the source room
        const activeStaysInSourceRes = await client.query(`
            SELECT grs.*, r.room_number, r.current_status, g.guest_name
            FROM guest_room_stays grs
            JOIN rooms r ON grs.room_id = r.room_id
            JOIN guests g ON grs.guest_id = g.guest_id
            WHERE grs.room_id = $1 AND grs.stay_status = 'CHECKED_IN' FOR UPDATE
        `, [sourceRoomId]);
        const activeStaysInSource = activeStaysInSourceRes.rows;

        if (activeStaysInSource.length > 1 && !isGroup) {
            throw new Error('Individual room transfer is disabled for multi-occupancy rooms. Please perform a group transfer.');
        }

        // 3. Fetch the new room
        const roomRes = await client.query(`
            SELECT room_id, room_number, room_type, capacity, current_status
            FROM rooms
            WHERE room_number = $1 FOR UPDATE
        `, [newRoomNumber]);

        if (roomRes.rows.length === 0) {
            throw new Error(`Target room ${newRoomNumber} not found.`);
        }

        const newRoom = roomRes.rows[0];
        
        // 4. Rule 1: Check availability of new room
        const isAvail = await receptionRepository.isRoomAvailable(newRoom.room_id, client);
        if (!isAvail) {
            throw new Error(`Target room ${newRoomNumber} is not available.`);
        }

        // 5. Rule 5: Occupancy capacity validation for new room
        const targetRoomStaysRes = await client.query(`
            SELECT COUNT(*) as active_count FROM guest_room_stays
            WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
        `, [newRoom.room_id]);
        const activeCountInTarget = Number(targetRoomStaysRes.rows[0].active_count);

        const staysToTransfer = activeStaysInSource.length > 1 && isGroup ? activeStaysInSource : [stay];
        if (activeCountInTarget + staysToTransfer.length > newRoom.capacity + 1) {
            throw new Error(`Target room ${newRoomNumber} capacity exceeded. Max is ${newRoom.capacity} plus 1 extra bed.`);
        }

        const now = overrideNow ? new Date(overrideNow) : new Date();

        // Process transfers
        for (const s of staysToTransfer) {
            // 6. Close the old stay (Checked out at transfer time)
            await receptionRepository.updateGuestStayStatus(s.stay_id, {
                stay_status: 'CHECKED_OUT',
                checked_out_at: now,
                checked_out_by: transferredBy || null,
                operational_notes: (s.operational_notes || '') + `\nTransferred to Room ${newRoomNumber} on ${now.toISOString()}`
            }, client);

            // Also write to occupancy_history for the closed stay (from check-in to transfer time)
            const days = getCalendarDays(s.checked_in_at, now);
            for (const day of days) {
                await receptionRepository.insertOccupancyHistory({
                    booking_id: s.booking_id,
                    guest_id: s.guest_id,
                    room_id: s.room_id,
                    occupancy_date: day,
                    occupancy_type: s.occupancy_type,
                    guest_count: s.occupancy_type === 'single' ? 1 : 2,
                    extra_bed_count: s.extra_bed ? 1 : 0,
                    room_type: s.operational_room_type,
                    tariff_amount: s.operational_tariff,
                    generated_by: transferredBy || null
                }, client);
            }

            // 7. Create new stay in the target room
            const bRes = await client.query(`SELECT category_id FROM booking_requests WHERE booking_id = $1`, [s.booking_id]);
            const booking = bRes.rows[0];
            
            const tariffRes = await client.query(`
                SELECT single_occupancy, double_occupancy, extra_bed
                FROM room_tariffs
                WHERE category_id = $1 AND room_type = $2
            `, [booking.category_id, newRoom.room_type]);

            let operationalTariff = 0;
            if (tariffRes.rows.length > 0) {
                const t = tariffRes.rows[0];
                if (s.occupancy_type === 'single') {
                    operationalTariff = Number(t.single_occupancy);
                } else {
                    operationalTariff = Number(t.double_occupancy) / 2;
                }
                if (s.extra_bed) {
                    operationalTariff += Number(t.extra_bed) || 400;
                }
            }

            await receptionRepository.insertGuestStay({
                booking_id: s.booking_id,
                guest_id: s.guest_id,
                room_id: newRoom.room_id,
                checked_in_at: now,
                occupancy_type: s.occupancy_type,
                extra_bed: s.extra_bed,
                operational_room_type: newRoom.room_type,
                operational_tariff: operationalTariff,
                checked_in_by: transferredBy || null,
                operational_notes: `Transferred from Room ${s.room_number}. Remarks: ${remarks || ''}`
            }, client);
        }

        // Update old room status if no other active stay remains
        const oldRoomStaysRes = await client.query(`
            SELECT 1 FROM guest_room_stays
            WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
            LIMIT 1
        `, [sourceRoomId]);

        if (oldRoomStaysRes.rows.length === 0) {
            const oldRoomRes = await client.query(`SELECT room_number, current_status FROM rooms WHERE room_id = $1`, [sourceRoomId]);
            const oldRoom = oldRoomRes.rows[0];
            
            await client.query(`UPDATE rooms SET current_status = 'cleaning', updated_at = CURRENT_TIMESTAMP WHERE room_id = $1`, [sourceRoomId]);
            await receptionRepository.insertRoomStatusHistory({
                room_id: sourceRoomId,
                previous_status: oldRoom.current_status,
                new_status: 'cleaning',
                changed_by: transferredBy || null,
                remarks: `Room transfer of ${staysToTransfer.length} guest(s)`
            }, client);
        }

        // Update new room status to occupied
        await client.query(`UPDATE rooms SET current_status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE room_id = $1`, [newRoom.room_id]);
        await receptionRepository.insertRoomStatusHistory({
            room_id: newRoom.room_id,
            previous_status: newRoom.current_status,
            new_status: 'occupied',
            changed_by: transferredBy || null,
            remarks: `Room transfer of ${staysToTransfer.length} guest(s)`
        }, client);

        // Update allocated room numbers string in booking_requests for all affected bookings
        const uniqueBookingIds = Array.from(new Set(staysToTransfer.map(s => s.booking_id)));
        for (const bId of uniqueBookingIds) {
            const activeStaysNowRes = await client.query(`
                SELECT DISTINCT r.room_number
                FROM guest_room_stays grs
                JOIN rooms r ON grs.room_id = r.room_id
                WHERE grs.booking_id = $1 AND grs.stay_status = 'CHECKED_IN'
            `, [bId]);
            const currentRooms = activeStaysNowRes.rows.map(r => r.room_number).join(', ');

            await client.query(`
                UPDATE booking_requests
                SET allocated_room_numbers = $1, updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $2
            `, [currentRooms, bId]);
            
            // Generate auto audit log (skip for category 1)
            const catRes = await client.query('SELECT category_id FROM booking_requests WHERE booking_id = $1', [bId]);
            const isCat1 = catRes.rows.length > 0 && catRes.rows[0].category_id === 1;
            if (!isCat1) {
                await client.query(`
                    INSERT INTO audit_logs (user_id, action, target_entity, target_id, remarks)
                    VALUES ($1, $2, $3, $4, $5)
                `, [transferredBy, 'ROOM_TRANSFER', 'GUEST_ROOM_STAY', stayId, `Transferred ${staysToTransfer.length} guest(s) to Room ${newRoomNumber}. Remarks: ${remarks || ''}`]);
            }
        }

        await client.query('COMMIT');
        logger.info(`Room transfer completed successfully for stay ID: ${stayId} to Room ${newRoomNumber}`);
        return staysToTransfer[0];

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during room transfer: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.overrideStayBilling = async (overrideData) => {
    const { stayId, newRoomType, newOccupancy, newTariff, newExtraBed, overrideReason, overriddenBy } = overrideData;
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch active stay
        const stay = await receptionRepository.getStayById(stayId, client);
        if (!stay || stay.stay_status !== 'CHECKED_IN') {
            throw new Error('Active stay not found.');
        }

        // 2. Rule 7: check if final bill exists
        const finalBill = await receptionRepository.getFinalBillByBooking(stay.booking_id, client);
        if (finalBill) {
            throw new Error('Stay cannot be modified because the final bill has already been generated.');
        }

        // 3. Log override to billing_override_logs (skip for category 1)
        const catRes = await client.query('SELECT category_id FROM booking_requests WHERE booking_id = $1', [stay.booking_id]);
        const isCat1 = catRes.rows.length > 0 && catRes.rows[0].category_id === 1;

        if (!isCat1) {
            await receptionRepository.insertBillingOverrideLog({
                booking_request_id: stay.booking_id,
                guest_id: stay.guest_id,
                previous_room_type: stay.operational_room_type,
                new_room_type: newRoomType || stay.operational_room_type,
                previous_occupancy: stay.occupancy_type,
                new_occupancy: newOccupancy || stay.occupancy_type,
                previous_tariff: stay.operational_tariff,
                new_tariff: newTariff !== undefined ? newTariff : stay.operational_tariff,
                previous_extra_bed: stay.extra_bed,
                new_extra_bed: newExtraBed !== undefined ? newExtraBed : stay.extra_bed,
                override_reason: overrideReason || 'Manual override',
                overridden_by: overriddenBy
            }, client);

            // Delete stale PDF so it regenerates
            const fs = require('fs');
            const path = require('path');
            const stalePdfPath = path.join(process.cwd(), 'uploads/invoices', `${stay.booking_id}.pdf`);
            if (fs.existsSync(stalePdfPath)) {
                fs.unlinkSync(stalePdfPath);
            }
        }

        // 4. Update the stay
        const updatedStay = await receptionRepository.updateGuestStayStatus(stayId, {
            operational_room_type: newRoomType || null,
            occupancy_type: newOccupancy || null,
            operational_tariff: newTariff !== undefined ? newTariff : null,
            extra_bed: newExtraBed !== undefined ? newExtraBed : null,
            operational_notes: (stay.operational_notes || '') + `\nBilling overridden: ${overrideReason}`
        }, client);

        await client.query('COMMIT');
        logger.info(`Billing override logged and updated for stay ID: ${stayId}`);
        return updatedStay;

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error during billing override: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

exports.getBillingOverrideLogsByBooking = async (bookingId) => {
    return await receptionRepository.getBillingOverrideLogsByBooking(bookingId);
};

exports.getRoomHistory = async (roomNumber, page = 1, limit = 20) => {
    return await receptionRepository.getRoomHistory(roomNumber, page, limit);
};

// --- NEW POS / BILLING & BULK ROOM LOGIC ---

exports.getInstitutionConfig = async () => {
    const client = await db.getClient();
    try {
        return await receptionRepository.getInstitutionConfig(client);
    } finally {
        client.release();
    }
};

exports.updateInstitutionConfig = async (payload) => {
    return await receptionRepository.updateInstitutionConfig(payload);
};

exports.getPendingPayments = async (limit = 50, offset = 0, searchQuery = null, monthFilter = null, overrideNow = null) => {
    return await receptionRepository.getPendingPayments(limit, offset, searchQuery, monthFilter, overrideNow);
};

exports.getCompletedPayments = async (limit = 50, offset = 0, searchQuery = null, monthFilter = null, overrideNow = null) => {
    return await receptionRepository.getCompletedPayments(limit, offset, searchQuery, monthFilter, overrideNow);
};

exports.confirmPayment = async (bookingId, paymentData, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // 1. Fetch booking to get CategoryCode and ShortBookingId
        const bRes = await client.query(`SELECT booking_state, category_id, booking_seq FROM booking_requests WHERE booking_id = $1`, [bookingId]);
        if (bRes.rows.length === 0) throw new Error('Booking not found');
        const booking = bRes.rows[0];
        
        // Ensure checked out or checked in
        if (booking.booking_state !== 'CHECKED_OUT' && booking.booking_state !== 'CHECKED_IN') {
            throw new Error('Booking must be checked in or checked out before confirming final payment.');
        }

        // If the booking is still CHECKED_IN, we must ensure a final bill exists.
        // If it doesn't, we pre-generate/calculate it dynamically up to current time and save it so we can confirm payment.
        const billCheck = await client.query(`SELECT * FROM final_bills WHERE booking_id = $1`, [bookingId]);
        if (billCheck.rows.length === 0) {
            const billing = await exports.calculateBookingBilling(bookingId, client);
            await client.query(`
                INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, generated_by)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [bookingId, JSON.stringify(billing.breakdown), billing.subtotal, billing.gst, billing.total, userId]);
        }

        // Generate Invoice Number suffix
        const config = await receptionRepository.getInstitutionConfig(client);
        const prefix = config ? config.invoice_prefix : 'NITTGH/25-26/';
        
        // Next sequence
        const seq = await receptionRepository.getLatestInvoiceSequence(prefix, client);
        const nextSeq = String(seq + 1).padStart(4, '0');
        
        // Formatting: NITTGH/CAT-{CategoryCode}/{SeqNumber}
        const seqNum = booking.booking_seq;
        const appId = seqNum ? String(seqNum).padStart(4, '0') : bookingId.split('-')[0].toUpperCase();
        let catCode = 'I';
        if (booking.category_id == 2) catCode = 'II';
        if (booking.category_id == 3) catCode = 'III';
        if (booking.category_id == 4) catCode = 'IV';
        
        // Use standard booking invoice format (room number suffix not strictly required unless per-room splitting is requested later)
        const invoiceNumber = `${prefix}CAT-${catCode}/${appId}/${nextSeq}`;
        
        paymentData.invoice_number = invoiceNumber;
        paymentData.received_by = userId;
        
        const updatedBill = await receptionRepository.confirmPayment(bookingId, paymentData, client);
        
        // Update payment state
        const modeLabel = paymentData.payment_mode === 'Cash' ? 'PAID via Cash' : 'PAID via POS';
        await client.query(`UPDATE booking_requests SET payment_state = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE booking_id = $1`, [bookingId]);
        
        // Log audit
        await client.query(`INSERT INTO audit_logs (user_id, action, target_entity, target_id, new_value, remarks) VALUES ($1, 'CONFIRM_PAYMENT', 'final_bills', $2, $3, $4)`, 
            [userId, bookingId, JSON.stringify(paymentData), modeLabel]);

        await client.query('COMMIT');
        
        // Delete stale PDF so it regenerates on next GET
        const fs = require('fs');
        const path = require('path');
        const stalePdfPath = path.join(process.cwd(), 'uploads/invoices', `${bookingId}.pdf`);
        if (fs.existsSync(stalePdfPath)) {
            fs.unlinkSync(stalePdfPath);
        }

        return updatedBill;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.getActiveBulkBlocks = async () => {
    return await receptionRepository.getActiveBulkBlocks();
};

exports.createBulkBlock = async (payload, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Insert booking request
        const bRes = await client.query(`
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, arrival_datetime, departure_datetime,
                rooms_required, room_type, undertaking_accepted, booking_state, is_bulk, total_estimated_amount
            ) VALUES (
                $1, 1, $2, 'official', $3, $4, $5, 'Standard Room', true, 'CHECKED_IN', true, 0
            ) RETURNING booking_id
        `, [userId, payload.purpose_of_visit || 'Bulk Block', payload.arrival_datetime, payload.departure_datetime, payload.room_ids.length]);
        
        const bookingId = bRes.rows[0].booking_id;
        
        // Insert booking rooms
        for (const roomId of payload.room_ids) {
            await client.query(`
                INSERT INTO booking_rooms (booking_id, room_id, allocated_from, allocated_to, allocation_status)
                VALUES ($1, $2, $3, $4, 'reserved')
            `, [bookingId, roomId, payload.arrival_datetime, payload.departure_datetime]);
            
            // Note: We don't mark rooms as OCCUPIED here, they remain AVAILABLE but we will display them as BULK_BLOCKED in UI based on booking_rooms join
        }
        
        await client.query('COMMIT');
        return bookingId;
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23P01') {
            throw new Error('One or more selected rooms are already allocated during the specified dates. Please adjust your dates or select different rooms.');
        }
        throw err;
    } finally {
        client.release();
    }
};

exports.checkInBulkGuest = async (bookingId, roomId, guestData, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const ageVal = guestData.age === '' ? null : parseInt(guestData.age, 10);

        // 1. Insert Guest
        const gRes = await client.query(`
            INSERT INTO guests (
                booking_id, guest_name, email, phone, gender, age, identity_proof_type, identity_proof_number,
                arrival_datetime, departure_datetime, preferred_occupancy, preferred_extra_bed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, 'single', false)
            RETURNING guest_id
        `, [
            bookingId, guestData.guest_name, guestData.email, guestData.phone, guestData.gender, ageVal,
            guestData.identity_proof_type, guestData.identity_proof_number, guestData.departure_datetime
        ]);
        const guestId = gRes.rows[0].guest_id;
        
        // 2. Insert Stay
        const sRes = await client.query(`
            INSERT INTO guest_room_stays (
                booking_id, guest_id, room_id, checked_in_at, occupancy_type, extra_bed,
                operational_room_type, operational_tariff, checked_in_by, stay_status
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'single', false, 'Standard Room', 800, $4, 'CHECKED_IN')
            RETURNING *
        `, [bookingId, guestId, roomId, userId]);
        
        // 3. Mark room as occupied
        await client.query(`UPDATE rooms SET current_status = 'occupied' WHERE room_id = $1`, [roomId]);
        
        await client.query('COMMIT');
        return sRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.getPendingExtensionAllocations = async () => {
    const res = await db.query(`
        SELECT g.guest_id, g.guest_name, ext.requested_departure as new_checkout,
               b.booking_id, b.formatted_id, b.category_id, b.arrival_datetime,
               r.room_id, r.room_number as current_room, r.room_type as current_room_type,
               (SELECT MAX(allocated_to) FROM booking_rooms WHERE booking_id = g.booking_id AND room_id = r.room_id) as old_checkout
        FROM stay_extension_requests ext
        JOIN guests g ON ext.guest_id = g.guest_id
        JOIN guest_room_stays grs ON g.guest_id = grs.guest_id AND grs.stay_status = 'CHECKED_IN'
        JOIN rooms r ON grs.room_id = r.room_id
        JOIN booking_requests b ON g.booking_id = b.booking_id
        WHERE ext.status = 'APPROVED' AND ext.is_allocated = false
    `);
    return res.rows;
};

exports.allocateExtensionRoom = async (guestId, newRoomId, isSameRoom, allocatedBy) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Get the pending extension details
        const gRes = await client.query(`
            SELECT g.guest_id, ext.requested_departure as new_checkout_time, g.booking_id,
                   grs.room_id as current_room_id, r.room_type as current_room_type,
                   (SELECT MAX(allocated_to) FROM booking_rooms WHERE booking_id = g.booking_id AND room_id = grs.room_id) as old_checkout_time
            FROM guests g
            JOIN stay_extension_requests ext ON ext.guest_id = g.guest_id AND ext.status = 'APPROVED' AND ext.is_allocated = false
            JOIN guest_room_stays grs ON g.guest_id = grs.guest_id AND grs.stay_status = 'CHECKED_IN'
            JOIN rooms r ON grs.room_id = r.room_id
            WHERE g.guest_id = $1
        `, [guestId]);
        if (!gRes.rows.length) throw new Error('Guest or active stay not found');
        
        const guest = gRes.rows[0];
        
        if (isSameRoom) {
            // Check if current room is available for the extended period
            const overlapRes = await client.query(`
                SELECT 1 FROM booking_rooms 
                WHERE room_id = $1 AND booking_id != $2
                AND allocated_from < $3 AND allocated_to > $4
            `, [guest.current_room_id, guest.booking_id, guest.new_checkout_time, guest.old_checkout_time]);
            
            if (overlapRes.rows.length > 0) {
                throw new Error('Current room is blocked by another booking for the extended period.');
            }

            // Extend the allocation
            await client.query(`
                UPDATE booking_rooms 
                SET allocated_to = $1, updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $2 AND room_id = $3 AND allocated_to = $4
            `, [guest.new_checkout_time, guest.booking_id, guest.current_room_id, guest.old_checkout_time]);

            // Extend guest_room_stays checkout prediction if needed (optional since stay_status='CHECKED_IN')
            // No action needed for guest_room_stays right now, it will just end later.

        } else {
            if (!newRoomId) throw new Error('New room ID is required for a room transfer.');
            
            // Check if new room is available
            const overlapRes = await client.query(`
                SELECT 1 FROM booking_rooms 
                WHERE room_id = $1 
                AND allocated_from < $2 AND allocated_to > $3
            `, [newRoomId, guest.new_checkout_time, guest.old_checkout_time]);
            
            if (overlapRes.rows.length > 0) {
                throw new Error('Selected new room is already blocked for the extended period.');
            }

            // Enforce "same room type only" rule
            const newRoomRes = await client.query('SELECT room_type FROM rooms WHERE room_id = $1', [newRoomId]);
            if (!newRoomRes.rows.length) throw new Error('New room not found');
            if (newRoomRes.rows[0].room_type !== guest.current_room_type) {
                throw new Error(`Extension transfers must be to the same room type (${guest.current_room_type}).`);
            }

            // Allocate the new room from old_checkout_time to new_checkout_time
            await client.query(`
                INSERT INTO booking_rooms (booking_id, room_id, allocated_from, allocated_to, allocation_status, allocated_by)
                VALUES ($1, $2, $3, $4, 'reserved', $5)
            `, [guest.booking_id, newRoomId, guest.old_checkout_time, guest.new_checkout_time, allocatedBy]);
        }

        await client.query(`
            UPDATE stay_extension_requests 
            SET is_allocated = true, updated_at = CURRENT_TIMESTAMP
            WHERE guest_id = $1 AND status = 'APPROVED' AND is_allocated = false
        `, [guestId]);

        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.executeRoomTransfer = async (guestId, transferredBy) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Get the active stay
        const stayRes = await client.query(`
            SELECT * FROM guest_room_stays 
            WHERE guest_id = $1 AND stay_status = 'CHECKED_IN'
        `, [guestId]);
        if (!stayRes.rows.length) throw new Error('No active stay found for guest');
        const activeStay = stayRes.rows[0];

        // Find the newly allocated room that starts around now (we allow some leeway)
        const newAllocationRes = await client.query(`
            SELECT * FROM booking_rooms
            WHERE booking_id = $1 AND room_id != $2
            AND allocated_from <= CURRENT_TIMESTAMP + INTERVAL '1 hour'
            AND allocated_to > CURRENT_TIMESTAMP
            ORDER BY allocated_from ASC LIMIT 1
        `, [activeStay.booking_id, activeStay.room_id]);

        if (!newAllocationRes.rows.length) {
            throw new Error('No upcoming room allocation found to transfer into. Ensure room is allocated for the extension.');
        }
        const newRoomId = newAllocationRes.rows[0].room_id;

        // End current stay
        await client.query(`
            UPDATE guest_room_stays 
            SET checked_out_at = CURRENT_TIMESTAMP, stay_status = 'CHECKED_OUT', checked_out_by = $1
            WHERE stay_id = $2
        `, [transferredBy, activeStay.stay_id]);

        // Unmark old room occupied if no other stays are active in it
        const otherStays = await client.query(`SELECT 1 FROM guest_room_stays WHERE room_id = $1 AND stay_status = 'CHECKED_IN'`, [activeStay.room_id]);
        if (otherStays.rows.length === 0) {
            await client.query(`UPDATE rooms SET current_status = 'available' WHERE room_id = $1`, [activeStay.room_id]);
        }

        // Create new stay for the new room
        const newStayRes = await client.query(`
            INSERT INTO guest_room_stays (
                booking_id, guest_id, room_id, checked_in_at, occupancy_type, extra_bed,
                operational_room_type, operational_tariff, checked_in_by, stay_status
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, 'CHECKED_IN')
            RETURNING *
        `, [
            activeStay.booking_id, guestId, newRoomId, 
            activeStay.occupancy_type, activeStay.extra_bed,
            activeStay.operational_room_type, activeStay.operational_tariff,
            transferredBy
        ]);

        // Mark new room occupied
        await client.query(`UPDATE rooms SET current_status = 'occupied' WHERE room_id = $1`, [newRoomId]);

        // Audit log (skip for category 1)
        const catRes = await client.query('SELECT category_id FROM booking_requests WHERE booking_id = $1', [activeStay.booking_id]);
        const isCat1 = catRes.rows.length > 0 && catRes.rows[0].category_id === 1;
        if (!isCat1) {
            await client.query(`
                INSERT INTO audit_logs (user_id, action, target_entity, target_id, remarks)
                VALUES ($1, 'ROOM_TRANSFER', 'guests', $2, $3)
            `, [transferredBy, guestId, `Transferred from room_id ${activeStay.room_id} to ${newRoomId}`]);
        }

        await client.query('COMMIT');
        return newStayRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.updateBill = async (bookingId, payload, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const billRes = await client.query('SELECT * FROM final_bills WHERE booking_id = $1 FOR UPDATE', [bookingId]);
        if (!billRes.rows.length) throw new Error('Bill not found');
        const existingBill = billRes.rows[0];
        
        // Ensure only authorized edits. The payload contains new subtotal, gst, total, and updated JSON.
        const updatedBillJson = payload.generatedJson;
        const newSubtotal = payload.subtotal;
        const newGst = payload.gst;
        const newTotal = payload.total;
        
        const updateRes = await client.query(
            `UPDATE final_bills 
             SET generated_json = $1, subtotal = $2, gst = $3, total = $4, 
                 billing_type = $5, company_name = $6, gstin = $7, company_address = $8
             WHERE booking_id = $9 RETURNING *`,
            [
                updatedBillJson, 
                newSubtotal, 
                newGst, 
                newTotal,
                payload.billingType || existingBill.billing_type,
                payload.companyName || existingBill.company_name,
                payload.gstin || existingBill.gstin,
                payload.companyAddress || existingBill.company_address,
                bookingId
            ]
        );
        
        // Log the action
        await client.query(
            `INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`,
            [bookingId, userId, 'BILL_EDITED_BY_GHC', `GHC manually edited the bill parameters.`]
        );

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.decodeQrCode = async (code, overrideNow = null) => {
    let cleanCode = String(code || '').trim().toUpperCase();
    let roomSuffix = null;
    
    if (cleanCode.includes(':')) {
        const parts = cleanCode.split(':');
        cleanCode = parts[0].trim();
        roomSuffix = parts[1].trim();
    }
    
    if (cleanCode.startsWith('APP-')) cleanCode = cleanCode.replace('APP-', '').trim();
    else if (cleanCode.startsWith('APP ')) cleanCode = cleanCode.replace('APP ', '').trim();
    
    let booking = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(cleanCode)) {
        const res = await db.query('SELECT * FROM booking_requests WHERE booking_id = $1', [cleanCode]);
        if (res.rows.length > 0) booking = res.rows[0];
    }
    
    if (!booking) {
        const res = await db.query('SELECT * FROM booking_requests WHERE UPPER(formatted_id) = $1', [cleanCode]);
        if (res.rows.length > 0) booking = res.rows[0];
    }
    
    if (!booking) {
        if (!isNaN(cleanCode)) {
            const res = await db.query('SELECT * FROM booking_requests WHERE booking_seq = $1', [parseInt(cleanCode, 10)]);
            if (res.rows.length > 0) booking = res.rows[0];
        }
    }
    
    if (!booking) {
        const res = await db.query('SELECT * FROM booking_requests WHERE UPPER(formatted_id) LIKE $1', [`%${cleanCode}%`]);
        if (res.rows.length > 0) booking = res.rows[0];
    }
    
    if (!booking) {
        throw new Error('Application / Booking ID not found.');
    }
    
    const bookingId = booking.booking_id;
    
    const fullBookingRes = await db.query(`
        SELECT b.*, u.full_name as applicant_name, u.email as applicant_email, c.category_code
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        JOIN category_rules c ON b.category_id = c.category_id
        WHERE b.booking_id = $1
    `, [bookingId]);
    const fullBooking = fullBookingRes.rows[0];
    
    const guestsRes = await db.query('SELECT * FROM guests WHERE booking_id = $1', [bookingId]);
    fullBooking.guests = guestsRes.rows;
    
    const staysRes = await db.query(`
        SELECT grs.*, g.guest_name, g.relation_to_applicant, g.phone, g.email, r.room_number
        FROM guest_room_stays grs
        JOIN guests g ON grs.guest_id = g.guest_id
        LEFT JOIN rooms r ON grs.room_id = r.room_id
        WHERE grs.booking_id = $1
    `, [bookingId]);
    const stays = staysRes.rows;
    
    const finalBillRes = await db.query('SELECT * FROM final_bills WHERE booking_id = $1', [bookingId]);
    const finalBill = finalBillRes.rows[0] || null;
    fullBooking.final_bill = finalBill;
    
    let state = 'other';
    const bookingState = fullBooking.booking_state;
    const hasActiveStays = stays.some(s => s.stay_status === 'CHECKED_IN');
    
    if (bookingState === 'CHECKED_IN' || hasActiveStays) {
        state = 'staying';
    } else if (bookingState === 'CHECKED_OUT' || bookingState === 'COMPLETED') {
        state = 'checked_out';
    } else if (['ADMIN_APPROVED', 'CONFIRMED', 'READY_FOR_CHECKIN'].includes(bookingState)) {
        if (!fullBooking.allocated_room_numbers) {
            state = 'pending_assignment';
        } else {
            state = 'assigned_room';
        }
    }
    
    let stayLedger = null;
    if (state === 'checked_out') {
        if (finalBill) {
            stayLedger = {
                roomDaysBreakdown: finalBill.generated_json.roomDaysBreakdown || finalBill.generated_json,
                subtotal: Number(finalBill.subtotal),
                gst: Number(finalBill.gst),
                total: Number(finalBill.total)
            };
        } else {
            const calc = await exports.calculateBookingBilling(bookingId, null, overrideNow);
            stayLedger = {
                roomDaysBreakdown: calc.breakdown?.roomDaysBreakdown || [],
                subtotal: calc.subtotal,
                gst: calc.gst,
                total: calc.total
            };
        }
    }
    
    return {
        booking: fullBooking,
        state,
        roomSuffix,
        guestLedger: stays,
        stayLedger
    };
};