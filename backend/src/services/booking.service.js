const db = require('../db/db');
const bookingRepository = require('../repositories/booking.repository');
const { BOOKING_STATUS } = require('../utils/constants');

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

        // 4. ENGINE RULE: Conditional Requirement Checks (e.g., CAT-II Project Links)
        if (category.requires_project_code && !data.project_code) {
            throw new Error(`A valid project code is strictly required for ${category.category_code} bookings.`);
        }
        if (data.rooms_required > category.max_rooms_allowed) {
            throw new Error(`Exceeded max rooms allowed (${category.max_rooms_allowed}) for ${category.category_code}.`);
        }

        // 5. ENGINE RULE: Dynamic Payment Assignment
        const paymentResponsible = category.payment_modes && category.payment_modes.length > 0 
            ? category.payment_modes[0]  // Defaults based on matrix priority (e.g., 'institute' for CAT-I)
            : 'guest';

        // Handle date combination if passed from frontend date/time pickers
        const arrivalDatetime = data.arrival_datetime || `${data.arrival_date} ${data.arrival_time}:00`;
        const departureDatetime = data.departure_datetime || `${data.departure_date} ${data.departure_time}:00`;

        // 6. Evaluate Bypass & Auto-Approval Logic
        let initialState = BOOKING_STATUS.PENDING_APPROVER;
        let autoApproveLog = null;

        if (['super_admin', 'guest_house_admin'].includes(userRole)) {
            initialState = BOOKING_STATUS.ADMIN_APPROVED;
            autoApproveLog = 'Auto-approved as Admin booking.';
        } else if (data.assigned_approver_id === data.user_id) {
            initialState = BOOKING_STATUS.PENDING_ADMIN;
            autoApproveLog = 'Auto-approved by applicant (Self-Approval).';
        }

        // 7. Insert Booking Request
        const insertBookingQuery = `
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, project_code,
                arrival_datetime, departure_datetime, rooms_required, undertaking_accepted,
                booking_state, payment_responsible, room_type, extra_beds, total_estimated_amount, assigned_approver_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING booking_id;
        `;
        
        const bookingValues = [
            data.user_id, data.category_id, data.purpose_of_visit, data.visit_type, data.project_code || null,
            arrivalDatetime, departureDatetime, data.rooms_required, data.undertaking_accepted || true,
            initialState, paymentResponsible, data.room_type || 'Standard Room', data.extra_beds || 0, data.total_estimated_amount || 0, data.assigned_approver_id || null
        ];
        
        const bookingRes = await client.query(insertBookingQuery, bookingValues);
        const bookingId = bookingRes.rows[0].booking_id;

        // 8. Insert Associated Guest Details & Food Preferences
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING guest_id
                `, [
                    bookingId, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type, guest.id_proof_number,
                    guest.arrival_datetime || arrivalDatetime, guest.departure_datetime || departureDatetime
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

        const arrivalDatetime = data.arrival_datetime || `${data.arrival_date} ${data.arrival_time}:00`;
        const departureDatetime = data.departure_datetime || `${data.departure_date} ${data.departure_time}:00`;

        let newState = BOOKING_STATUS.PENDING_APPROVER;
        let autoApproveLog = null;

        if (['super_admin', 'guest_house_admin'].includes(userRole)) {
            newState = BOOKING_STATUS.ADMIN_APPROVED;
            autoApproveLog = 'Auto-approved as Admin booking upon reapplication.';
        } else if (data.assigned_approver_id === data.user_id) {
            newState = BOOKING_STATUS.PENDING_ADMIN;
            autoApproveLog = 'Auto-approved by applicant (Self-Approval) upon reapplication.';
        }

        await client.query(`
            UPDATE booking_requests SET 
                category_id = $1, purpose_of_visit = $2, visit_type = $3, project_code = $4,
                arrival_datetime = $5, departure_datetime = $6, rooms_required = $7,
                booking_state = $8, room_type = $9, extra_beds = $10, total_estimated_amount = $11,
                assigned_approver_id = $12, version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $13
        `, [
            data.category_id, data.purpose_of_visit, data.visit_type, data.project_code || null,
            arrivalDatetime, departureDatetime, data.rooms_required,
            newState, data.room_type || 'Standard Room', data.extra_beds || 0,
            data.total_estimated_amount || 0, data.assigned_approver_id || null, data.booking_id
        ]);
        await client.query('DELETE FROM guests WHERE booking_id = $1', [data.booking_id]);
        if (data.guests && data.guests.length > 0) {
            for (const guest of data.guests) {
                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number, arrival_datetime, departure_datetime)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING guest_id
                `, [data.booking_id, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type, guest.id_proof_number, guest.arrival_datetime || arrivalDatetime, guest.departure_datetime || departureDatetime]);
                const newGuestId = gRes.rows[0].guest_id;
                if (guest.food_preferences && guest.food_preferences.length > 0) {
                    for (const meal of guest.food_preferences) {
                        await client.query('INSERT INTO guest_food_preferences (guest_id, meal_date, breakfast, lunch, dinner, remarks) VALUES ($1, $2, $3, $4, $5, $6)', [newGuestId, meal.meal_date || meal.date, meal.breakfast || 0, meal.lunch || 0, meal.dinner || 0, meal.remarks]);
                    }
                }
            }
        }
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

exports.getAllBookingsForAdmin = async () => {
    return await bookingRepository.getAllBookingsWithDetails();
};

exports.getTariffs = async () => {
    return await bookingRepository.getAllTariffs();
};

exports.mockPayment = async (bookingId) => {
    const booking = await bookingRepository.updatePaymentState(bookingId, BOOKING_STATUS.READY_FOR_CHECKIN);
    if (!booking) throw new Error('Booking not found');
    return booking;
};

exports.updateAdminStatus = async (bookingId, action, remarks, approverId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const newState = action === 'APPROVED' ? BOOKING_STATUS.ADMIN_APPROVED : BOOKING_STATUS.ADMIN_REJECTED;
        const result = await client.query('UPDATE booking_requests SET booking_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *', [newState, bookingId]);
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

exports.getBookingById = async (bookingId) => {
    const booking = await bookingRepository.getBookingDetailsById(bookingId);
    if (!booking) throw new Error('Booking not found');
    return booking;
};

exports.cancelBooking = async (bookingId, userId) => {
    const booking = await bookingRepository.cancelBookingByUser(bookingId, userId, BOOKING_STATUS.CANCELLED);
    if (!booking) throw new Error('Booking not found or unauthorized');
    return booking;
};

exports.getAuthorities = async (categoryId) => {
    return await bookingRepository.getAuthoritiesByCategoryId(categoryId);
};

exports.getBookingHistory = async (bookingId) => {
    const result = await db.query('SELECT a.*, u.full_name as approver_name FROM approval_logs a LEFT JOIN users u ON a.approver_id = u.user_id WHERE a.booking_id = $1 ORDER BY a.created_at DESC', [bookingId]);
    return result.rows;
};