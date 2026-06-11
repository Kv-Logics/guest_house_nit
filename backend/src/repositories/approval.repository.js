const db = require('../db/db');

exports.getPendingApprovalsByRole = async (pendingState, userRole, userId) => {
    const query = `
        SELECT b.*, c.category_code, COALESCE(b.bulk_booking_metadata->>'applicant_name', u.full_name) as applicant_name,
               (
                   SELECT json_agg(g)
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests,
               (
                   SELECT json_agg(row_to_json(e)) FROM stay_extension_requests e WHERE e.booking_id = b.booking_id
               ) as stay_extension_requests
        FROM booking_requests b
        JOIN category_rules c ON b.category_id = c.category_id
        JOIN users u ON b.user_id = u.user_id
        WHERE (
            (b.booking_state = $1 AND (
                (c.approval_hierarchy LIKE '%' || $2 || '%' AND b.assigned_approver_id IS NULL)
                OR b.assigned_approver_id = $3
            ))
            OR
            (b.booking_state = 'PENDING_DIRECTOR' AND $2 = 'director')
            OR
            (EXISTS (
                SELECT 1 FROM stay_extension_requests ext 
                WHERE ext.booking_id = b.booking_id AND ext.status = 'PENDING_AUTHORITY'
            ) AND (
                (c.approval_hierarchy LIKE '%' || $2 || '%' AND b.assigned_approver_id IS NULL)
                OR b.assigned_approver_id = $3
            ))
        )
        ORDER BY b.created_at DESC
    `;
    
    const result = await db.query(query, [pendingState, userRole, userId]);
    return result.rows;
};

exports.getApprovalHistoryByApprover = async (approverId, actionFilter) => {
    // actionFilter will be 'APPROVED' or 'REJECTED'
    const query = `
        SELECT b.*, c.category_code, COALESCE(b.bulk_booking_metadata->>'applicant_name', u.full_name) as applicant_name,
               (
                   SELECT json_agg(g)
                   FROM guests g WHERE g.booking_id = b.booking_id
               ) as guests,
               (
                   SELECT json_agg(row_to_json(e)) FROM stay_extension_requests e WHERE e.booking_id = b.booking_id
               ) as stay_extension_requests,
               latest_al.action as approver_action,
               latest_al.created_at as action_date
        FROM booking_requests b
        JOIN category_rules c ON b.category_id = c.category_id
        JOIN users u ON b.user_id = u.user_id
        JOIN (
            SELECT DISTINCT ON (booking_id) booking_id, action, created_at
            FROM approval_logs
            WHERE approver_id = $1
            ORDER BY booking_id, created_at DESC
        ) latest_al ON b.booking_id = latest_al.booking_id
        WHERE latest_al.action = $2
    `;
    const result = await db.query(query, [approverId, actionFilter]);
    
    // Sort overall results by action_date descending
    return result.rows.sort((a, b) => new Date(b.action_date) - new Date(a.action_date));
};