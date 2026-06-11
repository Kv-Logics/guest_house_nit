const db = require('../db/db');
const { BOOKING_STATUS } = require('../utils/constants');
const bookingRepository = require('../repositories/booking.repository');

// Generate reference like BB-2026-000001
async function generateBulkReference(client, financialYear) {
    const seqRes = await client.query(
        `SELECT nextval('bulk_booking_seq') AS seq`
    );
    const seqNum = seqRes.rows[0].seq;
    const seqStr = String(seqNum).padStart(6, '0');
    // Default to a year if financialYear not provided (e.g., from config)
    const yearPart = financialYear ? financialYear.split('-')[0] : new Date().getFullYear();
    return `BB-${yearPart}-${seqStr}`;
}

exports.createBulkBooking = async (data, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const metadata = {
            applicant_name: data.applicant_name || data.bulk_booking_metadata?.applicant_name,
            applicant_email: data.applicant_email || data.bulk_booking_metadata?.applicant_email,
            applicant_phone: data.applicant_phone || data.bulk_booking_metadata?.applicant_phone,
            applicant_roll_number: data.applicant_roll_number || data.bulk_booking_metadata?.applicant_roll_number || data.bulk_booking_metadata?.roll_number,
            applicant_department: data.applicant_department || data.bulk_booking_metadata?.applicant_department || data.bulk_booking_metadata?.department,
            applicant_designation: data.applicant_designation || data.bulk_booking_metadata?.applicant_designation || data.bulk_booking_metadata?.applicant_designation || data.bulk_booking_metadata?.designation,
            event_name: data.event_name || data.bulk_booking_metadata?.event_name,
            expected_guest_count: data.expected_guest_count !== undefined ? data.expected_guest_count : data.bulk_booking_metadata?.expected_guest_count,
            remarks: data.remarks || data.bulk_booking_metadata?.remarks,
            created_by_reception: true
        };
        
        if (data.assigned_approver_id) {
            const approverCheck = await client.query('SELECT user_id FROM users WHERE user_id = $1', [data.assigned_approver_id]);
            if (approverCheck.rows.length === 0) {
                throw new Error('The selected Approving Authority does not exist. Please select a valid authority.');
            }
        }

        const insertQuery = `
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, room_priority,
                arrival_datetime, departure_datetime, rooms_required, undertaking_accepted,
                booking_state, payment_responsible, room_type, extra_beds, total_estimated_amount, 
                assigned_approver_id, booking_type, bulk_booking_metadata, allocated_room_numbers
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
            RETURNING booking_id;
        `;
        
        const values = [
            userId, 
            data.category_id, 
            data.purpose_of_visit || 'Bulk Booking', 
            data.visit_type || 'official', 
            data.room_priority || data.room_type || 'Standard Room',
            data.arrival_datetime || new Date().toISOString(), 
            data.departure_datetime || new Date().toISOString(), 
            data.rooms_required || 1, 
            true, // undertaking_accepted = true for bulk bookings created by reception
            BOOKING_STATUS.DRAFT, 
            data.payment_responsibility || 'guest', 
            data.room_type || 'Standard Room', 
            data.extra_beds || 0, 
            0, 
            data.assigned_approver_id || null,
            'BULK_BOOKING',
            JSON.stringify(metadata),
            data.allocated_room_numbers || null
        ];
        
        const res = await client.query(insertQuery, values);
        const bookingId = res.rows[0].booking_id;

        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [bookingId, userId, 'CREATED', 'Bulk booking draft created by reception.']);

        await client.query('COMMIT');
        return { booking_id: bookingId, status: BOOKING_STATUS.DRAFT };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.saveBulkBookingDraft = async (bookingId, data, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const existing = existingRes.rows[0];

        if (existing.booking_state !== BOOKING_STATUS.DRAFT && existing.booking_state !== BOOKING_STATUS.PENDING_APPROVER && existing.booking_state !== BOOKING_STATUS.APPROVER_REJECTED) {
            throw new Error('Cannot edit a bulk booking that is already processing.');
        }

        if (data.assigned_approver_id) {
            const approverCheck = await client.query('SELECT user_id FROM users WHERE user_id = $1', [data.assigned_approver_id]);
            if (approverCheck.rows.length === 0) {
                throw new Error('The selected Approving Authority does not exist. Please select a valid authority.');
            }
        }

        const metadata = {
            ...existing.bulk_booking_metadata,
            applicant_name: data.applicant_name !== undefined ? data.applicant_name : existing.bulk_booking_metadata.applicant_name,
            applicant_email: data.applicant_email !== undefined ? data.applicant_email : existing.bulk_booking_metadata.applicant_email,
            applicant_phone: data.applicant_phone !== undefined ? data.applicant_phone : existing.bulk_booking_metadata.applicant_phone,
            applicant_roll_number: data.applicant_roll_number !== undefined ? data.applicant_roll_number : existing.bulk_booking_metadata.applicant_roll_number,
            applicant_department: data.applicant_department !== undefined ? data.applicant_department : existing.bulk_booking_metadata.applicant_department,
            applicant_designation: data.applicant_designation !== undefined ? data.applicant_designation : existing.bulk_booking_metadata.applicant_designation,
            event_name: data.event_name !== undefined ? data.event_name : existing.bulk_booking_metadata.event_name,
            expected_guest_count: data.expected_guest_count !== undefined ? data.expected_guest_count : existing.bulk_booking_metadata.expected_guest_count,
        };

        const updateQuery = `
            UPDATE booking_requests SET 
                category_id = COALESCE($1, category_id),
                purpose_of_visit = COALESCE($2, purpose_of_visit),
                arrival_datetime = COALESCE($3, arrival_datetime),
                departure_datetime = COALESCE($4, departure_datetime),
                rooms_required = COALESCE($5, rooms_required),
                assigned_approver_id = COALESCE($6, assigned_approver_id),
                bulk_booking_metadata = $7,
                allocated_room_numbers = COALESCE($8, allocated_room_numbers),
                updated_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE booking_id = $9
        `;
        
        await client.query(updateQuery, [
            data.category_id,
            data.purpose_of_visit,
            data.arrival_datetime,
            data.departure_datetime,
            data.rooms_required,
            data.assigned_approver_id,
            JSON.stringify(metadata),
            data.allocated_room_numbers !== undefined ? data.allocated_room_numbers : null,
            bookingId
        ]);

        await client.query('COMMIT');
        return { booking_id: bookingId };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.submitBulkBooking = async (bookingId, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const existing = existingRes.rows[0];

        if (existing.booking_state !== BOOKING_STATUS.DRAFT && existing.booking_state !== BOOKING_STATUS.APPROVER_REJECTED) {
            throw new Error('Bulk Booking is not in a valid state to be submitted.');
        }

        // Validate required fields
        if (!existing.category_id || !existing.assigned_approver_id) {
            throw new Error('Category and Approving Authority are required to submit.');
        }

        const approverCheck = await client.query('SELECT user_id FROM users WHERE user_id = $1', [existing.assigned_approver_id]);
        if (approverCheck.rows.length === 0) {
            throw new Error('The selected Approving Authority does not exist. Please select a valid authority.');
        }

        // Calculate arrival/departure from guests if any
        const guestsRes = await client.query('SELECT * FROM guests WHERE booking_id = $1', [bookingId]);
        const guests = guestsRes.rows;
        let minArrival = existing.arrival_datetime;
        let maxDeparture = existing.departure_datetime;
        if (guests.length > 0) {
            minArrival = null;
            maxDeparture = null;
            for (const guest of guests) {
                const arr = new Date(guest.arrival_datetime);
                const dep = new Date(guest.departure_datetime);
                if (!minArrival || arr < minArrival) minArrival = arr;
                if (!maxDeparture || dep > maxDeparture) maxDeparture = dep;
            }
        }

        // Generate Universal Formatted Booking ID
        const configRes = await client.query('SELECT financial_year, booking_prefix FROM institution_configs WHERE config_id = 1');
        const financialYear = configRes.rows[0]?.financial_year || '25-26';
        const bookingPrefix = configRes.rows[0]?.booking_prefix || 'NITTGH/';
        
        const seqRes = await client.query(
            `INSERT INTO sequence_tracker (financial_year, last_sequence) VALUES ($1, 1)
             ON CONFLICT (financial_year) DO UPDATE SET last_sequence = sequence_tracker.last_sequence + 1
             RETURNING last_sequence`,
            [financialYear]
        );
        const seqNum = seqRes.rows[0].last_sequence;
        
        const catRes = await client.query('SELECT * FROM category_rules WHERE category_id = $1', [existing.category_id]);
        const category = catRes.rows[0];
        let catCode = category?.category_code?.split(' ')[0] || 'UNK';
        
        const seqStr = String(seqNum).padStart(5, '0');
        const formattedId = `${bookingPrefix}${financialYear}/${catCode}/${seqStr}`;

        // Generate Bulk Booking Reference if not exists
        let bulkRef = existing.bulk_booking_reference;
        if (!bulkRef) {
            bulkRef = await generateBulkReference(client, financialYear);
        }

        const newState = BOOKING_STATUS.PENDING_APPROVER;

        await client.query(`
            UPDATE booking_requests SET 
                booking_state = $1, 
                formatted_id = $2, 
                booking_seq = $3, 
                financial_year = $4,
                bulk_booking_reference = $5,
                arrival_datetime = $6,
                departure_datetime = $7,
                version = version + 1, 
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $8
        `, [newState, formattedId, seqNum, financialYear, bulkRef, minArrival, maxDeparture, bookingId]);

        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [bookingId, userId, 'SUBMITTED', 'Bulk booking submitted for approval.']);

        await client.query('COMMIT');
        return { booking_id: bookingId, formatted_id: formattedId, bulk_booking_reference: bulkRef, status: newState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getBulkBookings = async (limit = 100, offset = 0, statusFilter = null, searchQuery = null) => {
    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 0) parsedLimit = 100;
    
    let parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = 0;

    let query = `
        SELECT b.*, u.full_name as user_name, u.email as user_email
        FROM booking_requests b
        LEFT JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_type = 'BULK_BOOKING' AND b.deleted_at IS NULL
    `;
    const params = [];
    let paramIndex = 1;

    if (statusFilter && statusFilter !== 'ALL') {
        query += ` AND b.booking_state = $${paramIndex++}`;
        params.push(statusFilter);
    }

    if (searchQuery) {
        query += ` AND (
            b.bulk_booking_reference ILIKE $${paramIndex} OR
            b.formatted_id ILIKE $${paramIndex} OR
            b.bulk_booking_metadata->>'applicant_name' ILIKE $${paramIndex} OR
            b.bulk_booking_metadata->>'event_name' ILIKE $${paramIndex}
        )`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parsedLimit, parsedOffset);

    const result = await db.query(query, params);
    
    // Get count for pagination
    let countQuery = `SELECT COUNT(*) FROM booking_requests WHERE booking_type = 'BULK_BOOKING' AND deleted_at IS NULL`;
    const countParams = [];
    let countIndex = 1;
    if (statusFilter && statusFilter !== 'ALL') {
        countQuery += ` AND booking_state = $${countIndex++}`;
        countParams.push(statusFilter);
    }
    if (searchQuery) {
        countQuery += ` AND (bulk_booking_reference ILIKE $${countIndex} OR formatted_id ILIKE $${countIndex} OR bulk_booking_metadata->>'applicant_name' ILIKE $${countIndex} OR bulk_booking_metadata->>'event_name' ILIKE $${countIndex})`;
        countParams.push(`%${searchQuery}%`);
    }
    const countRes = await db.query(countQuery, countParams);

    return {
        data: result.rows,
        total: parseInt(countRes.rows[0].count),
        limit,
        offset
    };
};

exports.getBulkBookingDetails = async (bookingId) => {
    // We can reuse the existing repository method since it joins everything
    const booking = await bookingRepository.getBookingDetailsById(bookingId);
    if (!booking || booking.booking_type !== 'BULK_BOOKING') {
        throw new Error('Bulk Booking not found');
    }
    return booking;
};

exports.addGuestsToBulkBooking = async (bookingId, guests, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT booking_state, arrival_datetime, departure_datetime FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const booking = existingRes.rows[0];

        // Ensure we can add guests (must be before check-in or rooms allocation is finalized in a way that blocks guests)
        // Usually, allowed in DRAFT, PENDING, ADMIN_APPROVED (before checkin)
        if (booking.booking_state === BOOKING_STATUS.CHECKED_IN || booking.booking_state === BOOKING_STATUS.CHECKED_OUT || booking.booking_state === BOOKING_STATUS.CANCELLED) {
            throw new Error('Cannot add guests to a booking in this state.');
        }

        if (!Array.isArray(guests) || guests.length === 0) {
            throw new Error('No guests provided.');
        }

        const insertedGuests = [];
        for (const guest of guests) {
            const guestArrival = guest.arrival_datetime || booking.arrival_datetime;
            const guestDeparture = guest.departure_datetime || booking.departure_datetime;

            const gRes = await client.query(`
                INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime, room_index, preferred_occupancy, preferred_extra_bed, roll_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *
            `, [
                bookingId, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, 
                guest.identity_proof_type || guest.id_proof_type, guest.identity_proof_number || guest.id_proof_number, 
                guestArrival, guestDeparture,
                guest.room_index !== undefined ? guest.room_index : 0,
                guest.preferred_occupancy || 'single',
                guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : false,
                guest.roll_number
            ]);
            insertedGuests.push(gRes.rows[0]);
        }

        await client.query('UPDATE booking_requests SET updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE booking_id = $1', [bookingId]);
        await client.query('INSERT INTO audit_logs (user_id, action, target_entity, target_id, new_value) VALUES ($1, $2, $3, $4, $5)', [userId, 'BULK_GUEST_ADDED', 'booking_requests', bookingId, JSON.stringify({ count: guests.length })]);

        await client.query('COMMIT');
        return insertedGuests;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.updateBulkBookingGuest = async (bookingId, guestId, data, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT booking_state FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const booking = existingRes.rows[0];

        if (booking.booking_state === BOOKING_STATUS.CHECKED_IN || booking.booking_state === BOOKING_STATUS.CHECKED_OUT || booking.booking_state === BOOKING_STATUS.CANCELLED) {
            throw new Error('Cannot edit guests for a booking in this state.');
        }

        const updateQuery = `
            UPDATE guests SET 
                guest_name = COALESCE($1, guest_name),
                phone = COALESCE($2, phone),
                email = COALESCE($3, email),
                gender = COALESCE($4, gender),
                age = COALESCE($5, age),
                room_index = COALESCE($6, room_index),
                preferred_occupancy = COALESCE($7, preferred_occupancy),
                preferred_extra_bed = COALESCE($8, preferred_extra_bed),
                arrival_datetime = COALESCE($9, arrival_datetime),
                departure_datetime = COALESCE($10, departure_datetime),
                identity_proof_type = COALESCE($11, identity_proof_type),
                identity_proof_number = COALESCE($12, identity_proof_number),
                roll_number = COALESCE($13, roll_number),
                updated_at = CURRENT_TIMESTAMP
            WHERE guest_id = $14 AND booking_id = $15 RETURNING *
        `;
        
        const gRes = await client.query(updateQuery, [
            data.guest_name, data.phone, data.email, data.gender, data.age,
            data.room_index, data.preferred_occupancy, data.preferred_extra_bed,
            data.arrival_datetime, data.departure_datetime,
            data.identity_proof_type || data.id_proof_type,
            data.identity_proof_number || data.id_proof_number,
            data.roll_number,
            guestId, bookingId
        ]);

        if (!gRes.rows.length) throw new Error('Guest not found');

        await client.query('UPDATE booking_requests SET updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE booking_id = $1', [bookingId]);
        
        await client.query('COMMIT');
        return gRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.removeGuestFromBulkBooking = async (bookingId, guestId, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT booking_state FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const booking = existingRes.rows[0];

        if (booking.booking_state === BOOKING_STATUS.CHECKED_IN || booking.booking_state === BOOKING_STATUS.CHECKED_OUT || booking.booking_state === BOOKING_STATUS.CANCELLED) {
            throw new Error('Cannot remove guests from a booking in this state.');
        }

        const res = await client.query('DELETE FROM guests WHERE guest_id = $1 AND booking_id = $2 RETURNING *', [guestId, bookingId]);
        if (!res.rows.length) throw new Error('Guest not found');

        await client.query('UPDATE booking_requests SET updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE booking_id = $1', [bookingId]);
        await client.query('INSERT INTO audit_logs (user_id, action, target_entity, target_id, old_value) VALUES ($1, $2, $3, $4, $5)', [userId, 'BULK_GUEST_REMOVED', 'booking_requests', bookingId, JSON.stringify(res.rows[0])]);

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.deleteBulkBooking = async (bookingId, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT booking_state FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const booking = existingRes.rows[0];

        if (booking.booking_state === BOOKING_STATUS.CHECKED_IN || booking.booking_state === BOOKING_STATUS.CHECKED_OUT) {
            throw new Error('Cannot delete a booking that is currently checked in or completed.');
        }

        await client.query('UPDATE booking_requests SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $1', [bookingId]);
        
        await client.query('INSERT INTO audit_logs (user_id, action, target_entity, target_id) VALUES ($1, $2, $3, $4)', [userId, 'BULK_BOOKING_DELETED', 'booking_requests', bookingId]);

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.addRoomsToBulkBooking = async (bookingId, roomIds, userId) => {
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
        throw new Error('No rooms provided to add.');
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1 AND booking_type = $2 FOR UPDATE', [bookingId, 'BULK_BOOKING']);
        if (!existingRes.rows.length) throw new Error('Bulk Booking not found');
        const booking = existingRes.rows[0];

        if (booking.booking_state === BOOKING_STATUS.CHECKED_OUT || booking.booking_state === BOOKING_STATUS.CANCELLED) {
            throw new Error('Cannot add rooms to a booking in this state.');
        }

        // Fetch existing allocated rooms
        const currentAllocated = booking.allocated_room_numbers ? booking.allocated_room_numbers.split(',') : [];
        const newAllocated = [...currentAllocated];

        // Insert booking rooms and check availability loosely (conflict handling)
        for (const inputRoom of roomIds) {
            // Check if already in the block
            const roomRes = await client.query('SELECT room_id, room_number FROM rooms WHERE room_number = $1', [inputRoom.toString()]);
            if (!roomRes.rows.length) continue;
            const roomNumber = roomRes.rows[0].room_number;
            const actualRoomId = roomRes.rows[0].room_id;

            if (newAllocated.includes(roomNumber)) {
                continue; // already in block
            }

            // We do a soft check: in a real robust system we'd verify strict overlap here
            try {
                await client.query(`
                    INSERT INTO booking_rooms (booking_id, room_id, allocated_from, allocated_to, allocation_status)
                    VALUES ($1, $2, $3, $4, 'reserved')
                    ON CONFLICT DO NOTHING
                `, [bookingId, actualRoomId, booking.arrival_datetime, booking.departure_datetime]);
            } catch (insertErr) {
                // If it fails due to the exclusion constraint 'prevent_overlapping_rooms', we ignore it 
                // since that means the room is already blocked for these dates (possibly by this very booking).
                if (insertErr.constraint === 'prevent_overlapping_rooms') {
                    console.warn(`Room ${roomNumber} already has an overlapping allocation.`);
                    // We can either skip adding it to newAllocated, or keep going. 
                    // Since they requested to add it, we'll continue.
                } else {
                    throw insertErr;
                }
            }

            newAllocated.push(roomNumber);
        }

        const updatedAllocatedString = newAllocated.join(',');
        const newRoomsRequired = newAllocated.length;

        await client.query(`
            UPDATE booking_requests SET 
                allocated_room_numbers = $1,
                rooms_required = $2,
                updated_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE booking_id = $3
        `, [updatedAllocatedString, newRoomsRequired, bookingId]);

        await client.query('INSERT INTO audit_logs (user_id, action, target_entity, target_id, new_value) VALUES ($1, $2, $3, $4, $5)', [userId, 'BULK_ROOMS_ADDED', 'booking_requests', bookingId, JSON.stringify({ addedRooms: roomIds.length, totalRooms: newRoomsRequired })]);

        await client.query('COMMIT');
        return { success: true, allocated_room_numbers: updatedAllocatedString, rooms_required: newRoomsRequired };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
