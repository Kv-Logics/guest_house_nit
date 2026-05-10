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

        // 6. Insert Booking Request (Sets state to PENDING_APPROVER)
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
            BOOKING_STATUS.PENDING_APPROVER, paymentResponsible, data.room_type || 'Standard Room', data.extra_beds || 0, data.total_estimated_amount || 0, data.assigned_approver_id || null
        ];
        
        const bookingRes = await client.query(insertBookingQuery, bookingValues);
        const bookingId = bookingRes.rows[0].booking_id;

        // 7. Insert Associated Guest Details & Food Preferences
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

        // 8. Handle Uploaded Documents
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

        await client.query('COMMIT');
        return { booking_id: bookingId, category: category.category_code, status: BOOKING_STATUS.PENDING_APPROVER };
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

exports.updateAdminStatus = async (bookingId, action) => {
    const newState = action === 'APPROVED' ? BOOKING_STATUS.ADMIN_APPROVED : BOOKING_STATUS.ADMIN_REJECTED;
    const booking = await bookingRepository.updateAdminState(bookingId, newState);
    if (!booking) throw new Error('Booking not found');
    return booking;
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