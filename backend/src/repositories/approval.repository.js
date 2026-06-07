const db = require('../db/db');

exports.getPendingApprovalsByRole = async (pendingState, userRole, userId) => {
    const query = `
        SELECT b.*, c.category_code, u.full_name as applicant_name,
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