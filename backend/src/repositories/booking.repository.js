const db = require('../db/db');

exports.getBookingsByUserId = async (userId) => {
    const query = `
        SELECT b.*, c.category_code, a.full_name as assigned_approver_name,
               a.department as assigned_approver_department,
               (SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.role_id WHERE ur.user_id = a.user_id LIMIT 1) as assigned_approver_role,
               (
                   SELECT json_agg(g)
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests
        FROM booking_requests b
        JOIN category_rules c ON b.category_id = c.category_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE b.user_id = $1 
        ORDER BY b.arrival_datetime ASC, b.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
};

exports.getAllBookingsWithDetails = async (limit = null, offset = 0, statusFilter = null, searchQuery = null, monthFilter = null) => {
    let query = `
        SELECT b.booking_id, b.formatted_id, b.booking_seq, b.booking_state, b.payment_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.created_at, b.pending_extension_datetime, b.checked_in_at, b.checked_out_at,
               b.purpose_of_visit, b.visit_type, b.room_priority, NULL as project_code, b.payment_responsible, b.category_id, b.room_type, b.extra_beds, b.total_estimated_amount, b.allocated_room_numbers, b.invoice_id, b.assigned_approver_id,
               u.full_name as applicant_name, u.department, u.email as applicant_email,
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
               ) as final_bill
        FROM booking_requests b
        JOIN users u ON b.user_id = u.user_id
        LEFT JOIN users a ON b.assigned_approver_id = a.user_id
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (statusFilter) {
        if (statusFilter === 'ADMIN_APPROVED') {
            query += ` AND b.booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED')`;
        } else if (statusFilter === 'ADMIN_REJECTED') {
            query += ` AND b.booking_state IN ('ADMIN_REJECTED', 'REJECTED')`;
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
            CAST(b.booking_seq AS text) ILIKE $${paramCount}
        )`;
        params.push(`%${searchQuery}%`);
        paramCount++;
    }
    if (monthFilter === 'archive') {
        query += ` AND date_trunc('month', b.created_at) < date_trunc('month', CURRENT_DATE)`;
    } else {
        query += ` AND date_trunc('month', b.created_at) = date_trunc('month', CURRENT_DATE)`;
    }

    query += ` ORDER BY b.arrival_datetime ASC, b.created_at DESC`;

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
        WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;

    if (statusFilter) {
        if (statusFilter === 'ADMIN_APPROVED') {
            countQuery += ` AND b.booking_state IN ('ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED')`;
        } else if (statusFilter === 'ADMIN_REJECTED') {
            countQuery += ` AND b.booking_state IN ('ADMIN_REJECTED', 'REJECTED')`;
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
        countQuery += ` AND date_trunc('month', b.created_at) < date_trunc('month', CURRENT_DATE)`;
    } else {
        countQuery += ` AND date_trunc('month', b.created_at) = date_trunc('month', CURRENT_DATE)`;
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
               u.full_name as applicant_name, u.department, u.email as applicant_email,
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
               ) as final_bill
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
    const isStudent = String(applicantRole).toLowerCase() === 'student';
    const cat3Roles = isStudent ? "'hod'" : "'faculty', 'staff', 'hod'";

    const query = `
        SELECT u.user_id, u.full_name, u.department, r.role_name as role
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE 
            ($1 = 1 AND r.role_name IN ('director', 'registrar', 'dean', 'hod')) OR
            ($1 = 2 AND r.role_name IN ('dean', 'hod')) OR
            ($1 = 3 AND r.role_name IN (${cat3Roles})) OR
            ($1 = 4 AND r.role_name IN ('registrar', 'hod', 'faculty'))
        ORDER BY r.role_id ASC, u.full_name ASC
    `;
    const result = await db.query(query, [categoryId]);
    return result.rows;
};