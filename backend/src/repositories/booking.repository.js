const db = require('../db/db');

exports.getBookingsByUserId = async (userId, userEmail = null) => {
    const query = `
        SELECT b.*, c.category_code, a.full_name as assigned_approver_name,
               a.department as assigned_approver_department,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = a.user_id LIMIT 1) as assigned_approver_role,
               (
                   SELECT json_agg(
                       row_to_json(g)::jsonb
                       || jsonb_build_object(
                           'stay_status', (
                               SELECT grs.stay_status FROM guest_room_stays grs
                               WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                               ORDER BY grs.checked_in_at DESC LIMIT 1
                           ),
                           'expected_departure', g.expected_departure
                       )
                   )
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests,
               (
                   SELECT json_agg(row_to_json(e)) FROM stay_extension_requests e WHERE e.booking_id = b.booking_id
               ) as stay_extension_requests
        FROM booking_requests b
        JOIN category_rules c ON b.category_id = c.category_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE (b.user_id = $1 OR (b.booking_type = 'BULK_BOOKING' AND b.bulk_booking_metadata->>'applicant_email' = $2))
          AND b.category_id != 4
        ORDER BY b.arrival_datetime ASC, b.created_at DESC
    `;
    const result = await db.query(query, [userId, userEmail || '']);
    return result.rows;
};

exports.getAllBookingsWithDetails = async (limit = null, offset = 0, statusFilter = null, searchQuery = null, monthFilter = null, sortBy = null) => {
    let query = `
        SELECT b.booking_id, b.formatted_id, b.booking_seq, b.booking_state, b.payment_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.created_at, b.pending_extension_datetime, b.checked_in_at, b.checked_out_at,
               b.purpose_of_visit, b.visit_type, b.room_priority, NULL as project_code, b.payment_responsible, b.category_id, b.room_type, b.extra_beds, b.total_estimated_amount, b.allocated_room_numbers, b.invoice_id, b.assigned_approver_id,
               b.booking_type, b.bulk_booking_reference, b.bulk_booking_metadata,
               u.full_name as applicant_name, COALESCE(a.department, u.department) as department, u.email as applicant_email,
               a.full_name as assigned_approver_name,
               a.department as assigned_approver_department,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = a.user_id LIMIT 1) as assigned_approver_role,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = u.user_id LIMIT 1) as applicant_role,
               (SELECT category_code FROM category_rules c WHERE c.category_id = b.category_id) as category_code,
               (
                   SELECT json_agg(row_to_json(g)::jsonb || jsonb_build_object('food_preferences', (SELECT json_agg(row_to_json(fp)) FROM guest_food_preferences fp WHERE fp.guest_id = g.guest_id)))
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests,
               (
                   SELECT json_agg(row_to_json(d)) FROM booking_documents d WHERE d.booking_id = b.booking_id
               ) as documents,
               (
                   SELECT row_to_json(fb) FROM final_bills fb WHERE fb.booking_id = b.booking_id
               ) as final_bill,
               (
                   SELECT json_agg(row_to_json(e)) FROM stay_extension_requests e WHERE e.booking_id = b.booking_id
               ) as stay_extension_requests
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE b.category_id != 4
    `;
    const params = [];
    let paramCount = 1;

    if (statusFilter) {
        if (statusFilter === 'ADMIN_APPROVED') {
            query += ` AND b.booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED')`;
        } else if (statusFilter === 'ADMIN_REJECTED') {
            query += ` AND b.booking_state IN ('ADMIN_REJECTED', 'REJECTED')`;
        } else if (statusFilter === 'PENDING_ADMIN') {
            query += ` AND (b.booking_state = 'PENDING_ADMIN' OR EXISTS (SELECT 1 FROM stay_extension_requests ext WHERE ext.booking_id = b.booking_id AND ext.status = 'PENDING_ADMIN'))`;
        } else {
            query += ` AND b.booking_state = $${paramCount}`;
            params.push(statusFilter);
            paramCount++;
        }
    }

    if (searchQuery) {
        query += ` AND (
            u.full_name ILIKE $${paramCount} OR 
            b.purpose_of_visit ILIKE $${paramCount} OR 
            b.booking_id::text ILIKE $${paramCount} OR
            CAST(b.booking_seq AS text) ILIKE $${paramCount} OR
            b.formatted_id ILIKE $${paramCount}
        )`;
        params.push(`%${searchQuery}%`);
        paramCount++;
    }
    const archiveCondition = `(b.booking_state IN ('CHECKED_OUT', 'CANCELLED', 'ADMIN_REJECTED', 'REJECTED') AND b.updated_at < CURRENT_TIMESTAMP - INTERVAL '1 month')`;
    if (monthFilter === 'archive') {
        query += ` AND ${archiveCondition}`;
    } else {
        query += ` AND NOT ${archiveCondition}`;
    }
    if (sortBy === 'app_asc') query += ` ORDER BY b.created_at ASC`;
    else if (sortBy === 'app_desc') query += ` ORDER BY b.created_at DESC`;
    else if (sortBy === 'arr_asc') query += ` ORDER BY b.arrival_datetime ASC, b.created_at DESC`;
    else if (sortBy === 'arr_desc') query += ` ORDER BY b.arrival_datetime DESC, b.created_at DESC`;
    else if (sortBy === 'book_asc') query += ` ORDER BY b.booking_id ASC`;
    else if (sortBy === 'book_desc') query += ` ORDER BY b.booking_id DESC`;
    else if (sortBy === 'cat_asc') query += ` ORDER BY b.category_id ASC, b.created_at DESC`;
    else if (sortBy === 'cat_desc') query += ` ORDER BY b.category_id DESC, b.created_at DESC`;
    else query += ` ORDER BY b.arrival_datetime ASC, b.created_at DESC`;

    if (limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        paramCount++;
        if (offset) {
            query += ` OFFSET $${paramCount}`;
            params.push(offset);
            paramCount++;
        }
    }

    let countQuery = `
        SELECT COUNT(*) as total_count
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE b.category_id != 4
    `;
    const countParams = [];
    let countParamCount = 1;

    if (statusFilter) {
        if (statusFilter === 'ADMIN_APPROVED') {
            countQuery += ` AND b.booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED')`;
        } else if (statusFilter === 'ADMIN_REJECTED') {
            countQuery += ` AND b.booking_state IN ('ADMIN_REJECTED', 'REJECTED')`;
        } else if (statusFilter === 'PENDING_ADMIN') {
            countQuery += ` AND (b.booking_state = 'PENDING_ADMIN' OR EXISTS (SELECT 1 FROM stay_extension_requests ext WHERE ext.booking_id = b.booking_id AND ext.status = 'PENDING_ADMIN'))`;
        } else {
            countQuery += ` AND b.booking_state = $${countParamCount}`;
            countParams.push(statusFilter);
            countParamCount++;
        }
    }

    if (searchQuery) {
        countQuery += ` AND (
            u.full_name ILIKE $${countParamCount} OR 
            b.purpose_of_visit ILIKE $${countParamCount} OR 
            b.booking_id::text ILIKE $${countParamCount} OR
            CAST(b.booking_seq AS text) ILIKE $${countParamCount}
        )`;
        countParams.push(`%${searchQuery}%`);
        countParamCount++;
    }
    if (monthFilter === 'archive') {
        countQuery += ` AND ${archiveCondition}`;
    } else {
        countQuery += ` AND NOT ${archiveCondition}`;
    }

    const [result, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, countParams)
    ]);

    return {
        rows: result.rows,
        totalCount: parseInt(countResult.rows[0].total_count, 10)
    };
};

exports.getAllTariffs = async () => {
    const result = await db.query("SELECT * FROM room_tariffs");
    return result.rows;
};

exports.updatePaymentState = async (bookingId, paymentState) => {
    const query = `UPDATE booking_requests SET payment_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`;
    const result = await db.query(query, [paymentState, bookingId]);
    return result.rows[0];
};

exports.updateAdminState = async (bookingId, bookingState) => {
    const query = `UPDATE booking_requests SET booking_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *`;
    const result = await db.query(query, [bookingState, bookingId]);
    return result.rows[0];
};

exports.getBookingDetailsById = async (bookingId) => {
    const query = `
        SELECT b.booking_id, b.formatted_id, b.booking_seq, b.booking_state, b.payment_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.created_at, b.pending_extension_datetime, b.checked_in_at, b.checked_out_at,
               b.purpose_of_visit, b.visit_type, b.room_priority, NULL as project_code, b.payment_responsible, b.category_id, b.room_type, b.extra_beds, b.total_estimated_amount, b.allocated_room_numbers, b.invoice_id, b.assigned_approver_id,
               b.booking_type, b.bulk_booking_reference, b.bulk_booking_metadata,
               u.full_name as applicant_name, COALESCE(a.department, u.department) as department, u.email as applicant_email,
               a.full_name as assigned_approver_name,
               a.department as assigned_approver_department,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = a.user_id LIMIT 1) as assigned_approver_role,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = u.user_id LIMIT 1) as applicant_role,
               (SELECT category_code FROM category_rules c WHERE c.category_id = b.category_id) as category_code,
               (
                   SELECT json_agg(row_to_json(g)::jsonb || jsonb_build_object(
                            'food_preferences', (SELECT json_agg(row_to_json(fp)) FROM guest_food_preferences fp WHERE fp.guest_id = g.guest_id),
                            'stay_id', (
                                SELECT grs.stay_id FROM guest_room_stays grs
                                WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                                ORDER BY grs.checked_in_at DESC LIMIT 1
                            ),
                            'stay_status', (
                                SELECT grs.stay_status FROM guest_room_stays grs
                                WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                                ORDER BY grs.checked_in_at DESC LIMIT 1
                            ),
                            'checked_in_at', (
                                SELECT grs.checked_in_at FROM guest_room_stays grs
                                WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                                ORDER BY grs.checked_in_at DESC LIMIT 1
                            ),
                            'checked_out_at', (
                                SELECT grs.checked_out_at FROM guest_room_stays grs
                                WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                                ORDER BY grs.checked_in_at DESC LIMIT 1
                            ),
                            'allocated_room', (
                                SELECT r.room_number FROM guest_room_stays grs
                                JOIN rooms r ON grs.room_id = r.room_id
                                WHERE grs.guest_id = g.guest_id AND grs.booking_id = b.booking_id
                                ORDER BY grs.checked_in_at DESC LIMIT 1
                            )
                        ))
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests,
               (
                   SELECT json_agg(row_to_json(d)) FROM booking_documents d WHERE d.booking_id = b.booking_id
               ) as documents,
               (
                   SELECT row_to_json(fb) FROM final_bills fb WHERE fb.booking_id = b.booking_id
               ) as final_bill,
               (
                   SELECT json_agg(row_to_json(e)) FROM stay_extension_requests e WHERE e.booking_id = b.booking_id
               ) as stay_extension_requests
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE b.booking_id = $1
    `;
    const result = await db.query(query, [bookingId]);
    return result.rows[0];
};

exports.cancelBookingByUser = async (bookingId, userId, cancelState) => {
    const query = `UPDATE booking_requests SET booking_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 AND user_id = $3 RETURNING *`;
    const result = await db.query(query, [cancelState, bookingId, userId]);
    return result.rows[0];
};

exports.getAuthoritiesByCategoryId = async (categoryId, applicantRole) => {
    const query = `
        SELECT u.user_id, u.full_name, u.email, u.department, r.role_name as role
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE r.role_name IN ('director', 'registrar', 'dean', 'hod')
        ORDER BY r.role_id ASC, u.full_name ASC
    `;
    const result = await db.query(query);
    return result.rows;
};