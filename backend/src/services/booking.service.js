const db = require('../db/db');
const bookingRepository = require('../repositories/booking.repository');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const MAX_STAY_EXTENSION_DAYS = 60;

function estimateBookingTotalFromTariffs(booking, tariffs, guestsList) {
    const categoryId = String(booking.category_id);
    const roomType = booking.room_type || 'Standard Room';
    const activeTariff =
        tariffs.find((t) => String(t.category_id) === categoryId && t.room_type === roomType) ||
        tariffs.find((t) => String(t.category_id) === categoryId);
    if (!activeTariff) return Number(booking.total_estimated_amount) || 0;

    const singleRate = Number(activeTariff.single_occupancy);
    const doubleRate = Number(activeTariff.double_occupancy);
    const extraBedRate = Number(activeTariff.extra_bed) || 400;

    if (!guestsList || guestsList.length === 0) return 0;

    const guestsDates = guestsList.map(g => {
        return {
            arrival: new Date(g.arrival_datetime || `${g.arrival_date} ${g.arrival_time || '12:00'}:00`),
            departure: new Date(g.departure_datetime || `${g.departure_date} ${g.departure_time || '12:00'}:00`)
        };
    });

    let minDate = null;
    let maxDate = null;
    for (const g of guestsDates) {
        if (!minDate || g.arrival < minDate) minDate = g.arrival;
        if (!maxDate || g.departure > maxDate) maxDate = g.departure;
    }

    if (!minDate || !maxDate) return 0;

    let totalSubtotal = 0;
    // Use calendar-day (midnight) boundaries — any stay within a calendar day counts as 1 day
    const startDay = new Date(minDate);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(maxDate);
    endDay.setHours(0, 0, 0, 0);
    // Guarantee minimum 1 day (e.g. same-day check-in/out, or sub-24hr stay)
    if (endDay <= startDay) endDay.setDate(endDay.getDate() + 1);

    let currentDay = new Date(startDay);
    while (currentDay < endDay) {
        let activeGuests = 0;
        for (const g of guestsDates) {
            // Normalise guest arrival/departure to calendar-day midnight for comparison
            const gArrDay = new Date(g.arrival); gArrDay.setHours(0, 0, 0, 0);
            const gDepDay = new Date(g.departure); gDepDay.setHours(0, 0, 0, 0);
            // Same-day departure still occupies that calendar day
            if (gDepDay <= gArrDay) gDepDay.setDate(gDepDay.getDate() + 1);
            // Guest is active on currentDay if: gArrDay <= currentDay < gDepDay
            if (gArrDay <= currentDay && currentDay < gDepDay) {
                activeGuests++;
            }
        }

        if (activeGuests > 0) {
            const R = Number(booking.rooms_required) || 1;
            let guestsRemaining = activeGuests;
            let doubleRoomsCount = 0;
            let singleRoomsCount = 0;
            let extraBedsCount = 0;

            let guestsInRooms = Array(R).fill(0);
            for (let i = 0; i < R; i++) {
                if (guestsRemaining > 0) {
                    guestsInRooms[i] = 1;
                    guestsRemaining--;
                }
            }
            for (let i = 0; i < R; i++) {
                if (guestsRemaining > 0 && guestsInRooms[i] === 1) {
                    guestsInRooms[i] = 2;
                    guestsRemaining--;
                }
            }
            extraBedsCount = guestsRemaining;

            for (let i = 0; i < R; i++) {
                if (guestsInRooms[i] === 2) {
                    doubleRoomsCount++;
                } else if (guestsInRooms[i] === 1) {
                    singleRoomsCount++;
                }
            }

            const roomCostForNight = (singleRoomsCount * singleRate) + (doubleRoomsCount * doubleRate);
            const extraBedCostForNight = extraBedsCount * extraBedRate;
            totalSubtotal += (roomCostForNight + extraBedCostForNight);
        }

        currentDay.setDate(currentDay.getDate() + 1);
    }

    return Math.round(totalSubtotal + totalSubtotal * 0.12);
}

/** Apply pending_extension_datetime to departure fields and totals; clears pending_extension_datetime. */
async function applyStayExtension(client, bookingId) {
    const bRes = await client.query(
        `SELECT b.*, (SELECT json_agg(g) FROM guests g WHERE g.booking_id = b.booking_id) AS guests
         FROM booking_requests b WHERE b.booking_id = $1`,
        [bookingId]
    );
    if (!bRes.rows.length) throw new Error('Booking not found');
    const booking = bRes.rows[0];
    const newDeparture = booking.pending_extension_datetime;
    if (!newDeparture) throw new Error('No pending extension to apply.');

    await client.query(
        `UPDATE guests
         SET departure_datetime = $1
         WHERE booking_id = $2 AND departure_datetime = $3`,
        [newDeparture, bookingId, booking.departure_datetime]
    );

    await client.query(
        `UPDATE booking_requests
         SET departure_datetime = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $2`,
        [newDeparture, bookingId]
    );

    const refreshed = await client.query(
        `SELECT b.*, (SELECT json_agg(g) FROM guests g WHERE g.booking_id = b.booking_id) AS guests
         FROM booking_requests b WHERE b.booking_id = $1`,
        [bookingId]
    );
    const row = refreshed.rows[0];
    const tariffsRes = await client.query('SELECT * FROM room_tariffs');
    const total = estimateBookingTotalFromTariffs(row, tariffsRes.rows, row.guests);

    await client.query(
        `UPDATE booking_requests
         SET total_estimated_amount = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $2`,
        [total, bookingId]
    );
}

exports.submitBookingRequest = async (data) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch User details & Role
        const userRes = await client.query(`
            SELECT r.role_name as role 
            FROM users u 
            JOIN user_roles ur ON u.user_id = ur.user_id 
            JOIN roles r ON ur.role_id = r.role_id 
            WHERE u.user_id = $1
        `, [data.user_id]);
        
        if (!userRes.rows.length) throw new Error('User not found.');
        const userRole = userRes.rows[0].role;

        // 2. Fetch Dynamic Category Rules (CAT-I, CAT-II, etc.)
        const catRes = await client.query('SELECT * FROM category_rules WHERE category_id = $1', [data.category_id]);
        if (!catRes.rows.length) throw new Error('Invalid Category Selection.');
        const category = catRes.rows[0];

        // 3. ENGINE RULE: Applicant Role Eligibility Check
        if (!category.allowed_applicant_roles.includes(userRole)) {
            throw new Error(`Your role (${userRole}) is not eligible to book under ${category.category_code}.`);
        }

        // 4. ENGINE RULE: Conditional Requirement Checks (e.g. max rooms)
        if (data.rooms_required > category.max_rooms_allowed) {
            throw new Error(`Exceeded max rooms allowed (${category.max_rooms_allowed}) for ${category.category_code}.`);
        }

        // 5. ENGINE RULE: Dynamic Payment Assignment
        const paymentResponsible = data.payment_responsibility || (category.payment_modes && category.payment_modes.length > 0 
            ? category.payment_modes[0]
            : 'guest');

        // Calculate min arrival and max departure dates from guest list
        let minArrival = null;
        let maxDeparture = null;
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const arr = new Date(guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`);
                const dep = new Date(guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`);
                if (!minArrival || arr < minArrival) minArrival = arr;
                if (!maxDeparture || dep > maxDeparture) maxDeparture = dep;
            }
        }
        const arrivalDatetime = minArrival ? minArrival.toISOString() : (data.arrival_datetime || `${data.arrival_date} ${data.arrival_time}:00`);
        const departureDatetime = maxDeparture ? maxDeparture.toISOString() : (data.departure_datetime || `${data.departure_date} ${data.departure_time}:00`);

        // 6. Evaluate Bypass & Auto-Approval Logic
        let initialState = BOOKING_STATUS.PENDING_APPROVER;
        let autoApproveLog = null;

        if (['super_admin', 'guest_house_admin'].includes(userRole)) {
            if (String(data.category_id) === '2') {
                initialState = BOOKING_STATUS.PENDING_APPROVER;
                autoApproveLog = null;
            } else {
                initialState = BOOKING_STATUS.ADMIN_APPROVED;
                autoApproveLog = 'Auto-approved as Admin booking.';
            }
        } else if (data.assigned_approver_id === data.user_id || (String(data.category_id) === '3' && userRole !== 'student')) {
            initialState = BOOKING_STATUS.PENDING_ADMIN;
            autoApproveLog = 'Auto-approved by applicant (Self-Approval).';
            data.assigned_approver_id = data.user_id;
        }

        // 7. Insert Booking Request
        const insertBookingQuery = `
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, room_priority,
                arrival_datetime, departure_datetime, rooms_required, undertaking_accepted,
                booking_state, payment_responsible, room_type, extra_beds, total_estimated_amount, assigned_approver_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING booking_id;
        `;
        
        const bookingValues = [
            data.user_id, data.category_id, data.purpose_of_visit, data.visit_type, data.room_priority || data.room_type || 'Standard Room',
            arrivalDatetime, departureDatetime, data.rooms_required, data.undertaking_accepted || true,
            initialState, paymentResponsible, data.room_type || 'Standard Room', data.extra_beds || 0, 0, data.assigned_approver_id || null
        ];
        
        const bookingRes = await client.query(insertBookingQuery, bookingValues);
        const bookingId = bookingRes.rows[0].booking_id;
        
        // Set initial formatted_id to the short hash of the UUID
        const shortId = String(bookingId).substring(0, 8).toUpperCase();
        await client.query('UPDATE booking_requests SET formatted_id = $1 WHERE booking_id = $2', [shortId, bookingId]);

        // 8. Insert Associated Guest Details & Food Preferences
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const guestArrival = guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`;
                const guestDeparture = guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`;

                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime, room_index, preferred_occupancy, preferred_extra_bed)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING guest_id
                `, [
                    bookingId, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type, guest.id_proof_number, guestArrival, guestDeparture,
                    guest.room_index !== undefined ? guest.room_index : 0,
                    guest.preferred_occupancy || 'single',
                    guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : false
                ]);
                
                const newGuestId = gRes.rows[0].guest_id;
                
                if (guest.food_preferences && guest.food_preferences.length > 0) {
                    for (const meal of guest.food_preferences) {
                        await client.query(`
                            INSERT INTO guest_food_preferences (guest_id, meal_date, breakfast, lunch, dinner, remarks) VALUES ($1, $2, $3, $4, $5, $6)
                        `, [newGuestId, meal.date, meal.breakfast || 0, meal.lunch || 0, meal.dinner || 0, meal.remarks]);
                    }
                }
            }
        }

        // Calculate actual pricing total
        const tariffsRes = await client.query('SELECT * FROM room_tariffs');
        const calculatedTotal = estimateBookingTotalFromTariffs({
            category_id: data.category_id,
            room_type: data.room_type || 'Standard Room',
            rooms_required: data.rooms_required,
            extra_beds: data.extra_beds || 0
        }, tariffsRes.rows, data.guests);

        await client.query(
            `UPDATE booking_requests SET total_estimated_amount = $1 WHERE booking_id = $2`,
            [calculatedTotal, bookingId]
        );

        // 9. Handle Uploaded Documents
        if (data.files) {
            const filesToInsert = [];
            if (data.files.document_1 && data.files.document_1[0]) filesToInsert.push({ doc: data.files.document_1[0], type: 'Primary Document' });
            if (data.files.document_2 && data.files.document_2[0]) filesToInsert.push({ doc: data.files.document_2[0], type: 'Additional Document' });

            for (const f of filesToInsert) {
                const filePath = `uploads/documents/${f.doc.filename}`;
                await client.query(`
                    INSERT INTO booking_documents (booking_id, uploaded_by_user_id, document_type, file_name, file_path, mime_type, file_size_bytes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [bookingId, data.user_id, f.type, f.doc.originalname, filePath, f.doc.mimetype, f.doc.size]);
            }
        }

        // 10. Log the initial submission and any auto-approvals
        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [bookingId, data.user_id, 'SUBMITTED', 'Application submitted by the applicant.']);

        if (autoApproveLog) {
            await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [bookingId, data.user_id, 'APPROVED', autoApproveLog]);
        }

        await client.query('COMMIT');
        return { booking_id: bookingId, category: category.category_code, status: initialState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.reapplyBookingRequest = async (data) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const existingRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1 AND user_id = $2', [data.booking_id, data.user_id]);
        if (!existingRes.rows.length) throw new Error('Booking not found or unauthorized.');
        const existing = existingRes.rows[0];
        if (!['APPROVER_REJECTED', 'ADMIN_REJECTED', 'CANCELLED'].includes(existing.booking_state)) {
            throw new Error('Only rejected or cancelled bookings can be reapplied.');
        }
        const catRes = await client.query('SELECT * FROM category_rules WHERE category_id = $1', [data.category_id]);
        const category = catRes.rows[0];

        // Retrieve user role for evaluation
        const userRes = await client.query(`
            SELECT r.role_name as role 
            FROM users u 
            JOIN user_roles ur ON u.user_id = ur.user_id 
            JOIN roles r ON ur.role_id = r.role_id 
            WHERE u.user_id = $1
        `, [data.user_id]);
        const userRole = userRes.rows[0].role;

        // Calculate min arrival and max departure dates from guest list
        let minArrival = null;
        let maxDeparture = null;
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const arr = new Date(guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`);
                const dep = new Date(guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`);
                if (!minArrival || arr < minArrival) minArrival = arr;
                if (!maxDeparture || dep > maxDeparture) maxDeparture = dep;
            }
        }
        const arrivalDatetime = minArrival ? minArrival.toISOString() : (data.arrival_datetime || `${data.arrival_date} ${data.arrival_time}:00`);
        const departureDatetime = maxDeparture ? maxDeparture.toISOString() : (data.departure_datetime || `${data.departure_date} ${data.departure_time}:00`);

        let newState = BOOKING_STATUS.PENDING_APPROVER;
        let autoApproveLog = null;

        if (['super_admin', 'guest_house_admin'].includes(userRole)) {
            if (String(data.category_id) === '2') {
                newState = BOOKING_STATUS.PENDING_APPROVER;
            } else {
                newState = BOOKING_STATUS.ADMIN_APPROVED;
                autoApproveLog = 'Auto-approved as Admin booking upon reapplication.';
            }
        } else if (data.assigned_approver_id === data.user_id || (String(data.category_id) === '3' && userRole !== 'student')) {
            newState = BOOKING_STATUS.PENDING_ADMIN;
            autoApproveLog = 'Auto-approved by applicant (Self-Approval) upon reapplication.';
            data.assigned_approver_id = data.user_id;
        }

        const paymentResponsible = data.payment_responsibility || (category.payment_modes && category.payment_modes.length > 0 
            ? category.payment_modes[0]
            : 'guest');

        await client.query(`
            UPDATE booking_requests SET 
                category_id = $1, purpose_of_visit = $2, visit_type = $3, room_priority = $4,
                arrival_datetime = $5, departure_datetime = $6, rooms_required = $7,
                booking_state = $8, room_type = $9, extra_beds = $10, total_estimated_amount = $11,
            assigned_approver_id = $12, payment_responsible = $13, version = version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $14
        `, [
            data.category_id, data.purpose_of_visit, data.visit_type, data.room_priority || data.room_type || 'Standard Room',
            arrivalDatetime, departureDatetime, data.rooms_required,
            newState, data.room_type || 'Standard Room', data.extra_beds || 0,
            0, data.assigned_approver_id || null, paymentResponsible, data.booking_id
        ]);
        
        await client.query('DELETE FROM guests WHERE booking_id = $1', [data.booking_id]);
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const guestArrival = guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`;
                const guestDeparture = guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`;

                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime, room_index, preferred_occupancy, preferred_extra_bed)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING guest_id
                `, [
                    data.booking_id, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type, guest.id_proof_number, guestArrival, guestDeparture,
                    guest.room_index !== undefined ? guest.room_index : 0,
                    guest.preferred_occupancy || 'single',
                    guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : false
                ]);
                
                const newGuestId = gRes.rows[0].guest_id;
                if (guest.food_preferences && guest.food_preferences.length > 0) {
                    for (const meal of guest.food_preferences) {
                        await client.query('INSERT INTO guest_food_preferences (guest_id, meal_date, breakfast, lunch, dinner, remarks) VALUES ($1, $2, $3, $4, $5, $6)', [newGuestId, meal.meal_date || meal.date, meal.breakfast || 0, meal.lunch || 0, meal.dinner || 0, meal.remarks]);
                    }
                }
            }
        }

        // Calculate actual pricing total
        const tariffsRes = await client.query('SELECT * FROM room_tariffs');
        const calculatedTotal = estimateBookingTotalFromTariffs({
            category_id: data.category_id,
            room_type: data.room_type || 'Standard Room',
            rooms_required: data.rooms_required,
            extra_beds: data.extra_beds || 0
        }, tariffsRes.rows, data.guests);

        await client.query(
            `UPDATE booking_requests SET total_estimated_amount = $1 WHERE booking_id = $2`,
            [calculatedTotal, data.booking_id]
        );
        if (data.files && (data.files.document_1 || data.files.document_2)) {
            const filesToInsert = [];
            if (data.files.document_1 && data.files.document_1[0]) filesToInsert.push({ doc: data.files.document_1[0], type: 'Primary Document' });
            if (data.files.document_2 && data.files.document_2[0]) filesToInsert.push({ doc: data.files.document_2[0], type: 'Additional Document' });
            for (const f of filesToInsert) {
                const filePath = `uploads/documents/${f.doc.filename}`;
                await client.query('INSERT INTO booking_documents (booking_id, uploaded_by_user_id, document_type, file_name, file_path, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [data.booking_id, data.user_id, f.type, f.doc.originalname, filePath, f.doc.mimetype, f.doc.size]);
            }
        }
        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [data.booking_id, data.user_id, 'REAPPLIED', 'Applicant modified and reapplied the booking.']);
        
        if (autoApproveLog) {
            await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [data.booking_id, data.user_id, 'APPROVED', autoApproveLog]);
        }
        await client.query('COMMIT');
        return { booking_id: data.booking_id, category: category.category_code, status: newState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getBookingsByUser = async (userId) => {
    return await bookingRepository.getBookingsByUserId(userId);
};

exports.getAllBookingsForAdmin = async (limit = null, offset = 0, statusFilter = null, searchQuery = null, monthFilter = null) => {
    return await bookingRepository.getAllBookingsWithDetails(limit, offset, statusFilter, searchQuery, monthFilter);
};

exports.getTariffs = async () => {
    return await bookingRepository.getAllTariffs();
};

exports.mockPayment = async (bookingId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const bRes = await client.query('SELECT booking_state FROM booking_requests WHERE booking_id = $1 FOR UPDATE', [bookingId]);
        if (bRes.rows.length === 0) throw new Error('Booking not found');
        const currentBookingState = bRes.rows[0].booking_state;
        const newBookingState = currentBookingState === BOOKING_STATUS.ADMIN_APPROVED ? BOOKING_STATUS.READY_FOR_CHECKIN : currentBookingState;

        const result = await client.query(
            `UPDATE booking_requests 
             SET payment_state = $1, booking_state = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE booking_id = $3 RETURNING *`,
            [PAYMENT_STATUS.PAID, newBookingState, bookingId]
        );
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.updateAdminStatus = async (bookingId, action, remarks, approverId, financialYear = '25-26') => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const checkRes = await client.query(
            'SELECT booking_state, pending_extension_datetime, category_id, booking_seq FROM booking_requests WHERE booking_id = $1 FOR UPDATE',
            [bookingId]
        );
        if (checkRes.rows.length === 0) throw new Error('Booking not found');
        const row = checkRes.rows[0];

        if (action === 'APPROVED' && row.booking_state !== BOOKING_STATUS.PENDING_ADMIN) {
            throw new Error('Admins can only approve bookings that have already been approved by the Authority.');
        }

        let result;
        if (action === 'WITHDRAW') {
            result = await client.query(
                `UPDATE booking_requests SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                [BOOKING_STATUS.PENDING_ADMIN, bookingId]
            );
        } else if (action === 'APPROVED' && row.pending_extension_datetime != null) {
            await applyStayExtension(client, bookingId);
            result = await client.query(
                `UPDATE booking_requests SET booking_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                [BOOKING_STATUS.CHECKED_IN, bookingId]
            );
        } else if (action === 'REJECTED' && row.pending_extension_datetime != null) {
            result = await client.query(
                `UPDATE booking_requests SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                [BOOKING_STATUS.CHECKED_IN, bookingId]
            );
        } else {
            const newState = action === 'APPROVED' ? BOOKING_STATUS.ADMIN_APPROVED : BOOKING_STATUS.ADMIN_REJECTED;
            
            if (action === 'APPROVED' && !row.booking_seq) {
                const seqRes = await client.query(
                    `INSERT INTO sequence_tracker (financial_year, last_sequence) VALUES ($1, 1)
                     ON CONFLICT (financial_year) DO UPDATE SET last_sequence = sequence_tracker.last_sequence + 1
                     RETURNING last_sequence`,
                    [financialYear]
                );
                const seqNum = seqRes.rows[0].last_sequence;
                
                const catRes = await client.query('SELECT category_code FROM category_rules WHERE category_id = $1', [row.category_id]);
                let catCode = catRes.rows[0]?.category_code?.split(' ')[0] || 'UNK';
                const seqStr = String(seqNum).padStart(4, '0');
                const formattedId = `NITTGH/${financialYear}/${catCode}/${seqStr}`;
                
                result = await client.query(
                    `UPDATE booking_requests SET booking_state = $1, pending_extension_datetime = NULL, booking_seq = $2, formatted_id = $3, financial_year = $4, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $5 RETURNING *`,
                    [newState, seqNum, formattedId, financialYear, bookingId]
                );
            } else {
                result = await client.query(
                    `UPDATE booking_requests SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                    [newState, bookingId]
                );
            }
        }

        if (result.rows.length === 0) throw new Error('Booking not found');
        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [bookingId, approverId, action, remarks || '']);
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Checked-in applicant requests exact Date/Time for extension; dates apply after full approval (or immediately for guest house admins).
 */
exports.requestStayExtension = async (bookingId, userId, newDepartureDatetime) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const lock = await client.query(
            'SELECT * FROM booking_requests WHERE booking_id = $1 AND user_id = $2 FOR UPDATE',
            [bookingId, userId]
        );
        if (!lock.rows.length) throw new Error('Booking not found or unauthorized.');
        const existing = lock.rows[0];
        if (existing.booking_state !== BOOKING_STATUS.CHECKED_IN) {
            throw new Error('Stay extension can only be requested while the guest is checked in.');
        }
        if (existing.pending_extension_datetime != null) {
            throw new Error('An extension is already pending approval for this booking.');
        }
        if (new Date(newDepartureDatetime) <= new Date(existing.departure_datetime)) {
             throw new Error('New departure time must be after the current departure time.');
        }

        const userRes = await client.query(
            `SELECT r.role_name AS role FROM users u
             JOIN user_roles ur ON u.user_id = ur.user_id
             JOIN roles r ON ur.role_id = r.role_id
             WHERE u.user_id = $1`,
            [userId]
        );
        if (!userRes.rows.length) throw new Error('User not found.');
        const userRole = userRes.rows[0].role;

        let targetState = BOOKING_STATUS.PENDING_APPROVER;
        let autoApproveLog = null;
        const instantApply = ['super_admin', 'guest_house_admin'].includes(userRole);

        if (instantApply) {
            autoApproveLog = 'Stay extension auto-approved (guest house admin).';
        } else if (existing.assigned_approver_id === userId) {
            targetState = BOOKING_STATUS.PENDING_ADMIN;
            autoApproveLog = 'Stay extension routed to admin (self-approved authority).';
        }

        if (instantApply) {
            await client.query(
                `UPDATE booking_requests SET pending_extension_datetime = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2`,
                [newDepartureDatetime, bookingId]
            );
            await applyStayExtension(client, bookingId);
        } else {
            await client.query(
                `UPDATE booking_requests SET pending_extension_datetime = $1, booking_state = $2, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $3`,
                [newDepartureDatetime, targetState, bookingId]
            );
        }

        await client.query(
            `INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`,
            [bookingId, userId, 'EXTENSION_REQUESTED', `Applicant requested a stay extension until ${new Date(newDepartureDatetime).toLocaleString()}.`]
        );

        if (autoApproveLog) {
            await client.query(
                `INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`,
                [bookingId, userId, 'APPROVED', autoApproveLog]
            );
        }

        await client.query('COMMIT');
        return await bookingRepository.getBookingDetailsById(bookingId);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getBookingById = async (bookingId) => {
    const booking = await bookingRepository.getBookingDetailsById(bookingId);
    if (!booking) throw new Error('Booking not found');
    return booking;
};

exports.cancelBooking = async (bookingId, user) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const bRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1', [bookingId]);
        if (bRes.rows.length === 0) throw new Error('Booking not found');
        const booking = bRes.rows[0];

        const userId = user.user_id || user.id;
        const userRole = String(user.role).toLowerCase();
        const isAdmin = ['super_admin', 'guest_house_admin'].includes(userRole);
        const isApprover = booking.assigned_approver_id === userId;
        const isApplicant = booking.user_id === userId;

        if (!isAdmin && !isApprover && !isApplicant) {
            throw new Error('Unauthorized to withdraw this booking.');
        }

        let updateRes;
        let logMessage = 'Cancelled by Applicant';
        let actionStr = 'CANCELLED';

        if (booking.checked_in_at != null && booking.checked_out_at == null) {
            // Checked in booking with pending extension being withdrawn
            updateRes = await client.query(
                `UPDATE booking_requests SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                [BOOKING_STATUS.CHECKED_IN, bookingId]
            );
            logMessage = 'Stay extension request withdrawn by Applicant';
            actionStr = 'EXTENSION_WITHDRAWN';
        } else {
            updateRes = await client.query(
                `UPDATE booking_requests SET booking_state = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`,
                [BOOKING_STATUS.CANCELLED, bookingId]
            );
            if (isAdmin && !isApplicant) logMessage = 'Withdrawn by Admin';
            else if (isApprover && !isApplicant) logMessage = 'Withdrawn by Authority';
        }

        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, userId, actionStr, logMessage]);

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getAuthorities = async (categoryId, applicantRole) => {
    return await bookingRepository.getAuthoritiesByCategoryId(categoryId, applicantRole);
};

exports.getBookingHistory = async (bookingId) => {
    const result = await db.query('SELECT a.*, u.full_name as approver_name FROM approval_logs a LEFT JOIN users u ON a.approver_id = u.user_id WHERE a.booking_id = $1 ORDER BY a.created_at DESC', [bookingId]);
    return result.rows;
};

exports.editBookingRequest = async (data) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const existingRes = await client.query('SELECT * FROM booking_requests WHERE booking_id = $1 FOR UPDATE', [data.booking_id]);
        if (!existingRes.rows.length) throw new Error('Booking not found');
        const existing = existingRes.rows[0];

        const userRole = String(data.role).toLowerCase();
        const isAdmin = ['super_admin', 'guest_house_admin', 'gh_coordinator'].includes(userRole);
        const isApplicant = existing.user_id === data.user_id;

        if (!isAdmin && !isApplicant) {
            throw new Error('Unauthorized to edit this booking.');
        }

        const allowedEditStates = ['PENDING_APPROVER', 'APPROVER_REJECTED', 'ADMIN_REJECTED', 'DRAFT'];
        if (String(existing.category_id) === '3' && isApplicant && userRole === 'faculty') {
            allowedEditStates.push('PENDING_ADMIN');
        }

        if (isApplicant && !isAdmin && !allowedEditStates.includes(existing.booking_state)) {
            throw new Error('This booking has progressed beyond the stage where it can be revised.');
        }

        // Calculate min arrival and max departure dates from guest list
        let minArrival = null;
        let maxDeparture = null;
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const arr = new Date(guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`);
                const dep = new Date(guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`);
                if (!minArrival || arr < minArrival) minArrival = arr;
                if (!maxDeparture || dep > maxDeparture) maxDeparture = dep;
            }
        }
        const arrivalDatetime = minArrival ? minArrival.toISOString() : (data.arrival_datetime || `${data.arrival_date} ${data.arrival_time}:00`);
        const departureDatetime = maxDeparture ? maxDeparture.toISOString() : (data.departure_datetime || `${data.departure_date} ${data.departure_time}:00`);

        let newState = existing.booking_state;
        let actionStr = 'ADMIN_CORRECTION';
        let logMessage = 'Admin corrected booking fields.';

        if (!isAdmin && isApplicant) {
            newState = BOOKING_STATUS.PENDING_APPROVER;
            actionStr = 'APPLICANT_REVISION';
            logMessage = 'Applicant revised booking, reverting state for re-approval.';

            const targetCat = String(data.category_id || existing.category_id);
            const assignedApp = data.assigned_approver_id || existing.assigned_approver_id;
            
            if (assignedApp === data.user_id || (targetCat === '3' && userRole !== 'student')) {
                newState = BOOKING_STATUS.PENDING_ADMIN;
                logMessage = 'Applicant revised booking, auto-approved by applicant (Self-Approval).';
                data.assigned_approver_id = data.user_id;
            }
            
            // Delete room stays since they might be invalid now
            await client.query('DELETE FROM guest_room_stays WHERE booking_id = $1 AND stay_status != $2', [data.booking_id, 'CHECKED_IN']);
        }

        const catRes = await client.query('SELECT * FROM category_rules WHERE category_id = $1', [data.category_id || existing.category_id]);
        const category = catRes.rows[0];
        const paymentResponsible = data.payment_responsibility || existing.payment_responsible;

        // Build diff
        let diffs = [];
        if (existing.room_type !== data.room_type) diffs.push(`Room Type: ${data.room_type}`);
        if (existing.rooms_required !== parseInt(data.rooms_required)) diffs.push(`Rooms: ${data.rooms_required}`);
        
        const finalLogMessage = diffs.length > 0 ? `${logMessage} Updates: ${diffs.join(', ')}` : logMessage;

        await client.query(`
            UPDATE booking_requests SET 
                category_id = $1, purpose_of_visit = $2, visit_type = $3, room_priority = $4,
                arrival_datetime = $5, departure_datetime = $6, rooms_required = $7,
                booking_state = $8, room_type = $9, extra_beds = $10,
            assigned_approver_id = $11, payment_responsible = $12, version = version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $13
        `, [
            data.category_id || existing.category_id, data.purpose_of_visit || existing.purpose_of_visit, 
            data.visit_type || existing.visit_type, data.room_priority || data.room_type || existing.room_priority,
            arrivalDatetime, departureDatetime, data.rooms_required || existing.rooms_required,
            newState, data.room_type || existing.room_type, data.extra_beds || existing.extra_beds,
            data.assigned_approver_id || existing.assigned_approver_id, paymentResponsible, data.booking_id
        ]);
        
        await client.query('DELETE FROM guests WHERE booking_id = $1', [data.booking_id]);
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const guestArrival = guest.arrival_datetime || `${guest.arrival_date} ${guest.arrival_time || '12:00'}:00`;
                const guestDeparture = guest.departure_datetime || `${guest.departure_date} ${guest.departure_time || '12:00'}:00`;

                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime, room_index, preferred_occupancy, preferred_extra_bed)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING guest_id
                `, [
                    data.booking_id, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type || guest.identity_proof_type, guest.id_proof_number || guest.identity_proof_number, guestArrival, guestDeparture,
                    guest.room_index !== undefined ? guest.room_index : 0,
                    guest.preferred_occupancy || 'single',
                    guest.preferred_extra_bed !== undefined ? guest.preferred_extra_bed : false
                ]);
                
                const newGuestId = gRes.rows[0].guest_id;
                if (guest.food_preferences && guest.food_preferences.length > 0) {
                    for (const meal of guest.food_preferences) {
                        await client.query('INSERT INTO guest_food_preferences (guest_id, meal_date, breakfast, lunch, dinner, remarks) VALUES ($1, $2, $3, $4, $5, $6)', [newGuestId, meal.meal_date || meal.date, meal.breakfast || 0, meal.lunch || 0, meal.dinner || 0, meal.remarks]);
                    }
                }
            }
        }

        const tariffsRes = await client.query('SELECT * FROM room_tariffs');
        const calculatedTotal = estimateBookingTotalFromTariffs({
            category_id: data.category_id || existing.category_id,
            room_type: data.room_type || existing.room_type,
            rooms_required: data.rooms_required || existing.rooms_required,
            extra_beds: data.extra_beds || existing.extra_beds
        }, tariffsRes.rows, data.guests);

        await client.query(
            `UPDATE booking_requests SET total_estimated_amount = $1 WHERE booking_id = $2`,
            [calculatedTotal, data.booking_id]
        );

        if (data.files && (data.files.document_1 || data.files.document_2)) {
            const filesToInsert = [];
            if (data.files.document_1 && data.files.document_1[0]) filesToInsert.push({ doc: data.files.document_1[0], type: 'Primary Document' });
            if (data.files.document_2 && data.files.document_2[0]) filesToInsert.push({ doc: data.files.document_2[0], type: 'Additional Document' });
            for (const f of filesToInsert) {
                const filePath = `uploads/documents/${f.doc.filename}`;
                await client.query('INSERT INTO booking_documents (booking_id, uploaded_by_user_id, document_type, file_name, file_path, mime_type, file_size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [data.booking_id, data.user_id, f.type, f.doc.originalname, filePath, f.doc.mimetype, f.doc.size]);
            }
        }

        await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [data.booking_id, data.user_id, actionStr, finalLogMessage]);
        
        await client.query('COMMIT');
        return { booking_id: data.booking_id, status: newState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};