const db = require('../db/db');

exports.getPendingApprovalsByRole = async (pendingState, userRole, userId) => {
    const query = `
        SELECT b.*, c.category_code, u.full_name as applicant_name
        FROM booking_requests b
        JOIN category_rules c ON b.category_id = c.category_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.booking_state = $1 
        AND c.approval_hierarchy LIKE '%' || $2 || '%'
        AND (b.assigned_approver_id IS NULL OR b.assigned_approver_id = $3)
        ORDER BY c.category_id ASC, b.created_at ASC
    `;
    
    const result = await db.query(query, [pendingState, userRole, userId]);
    return result.rows;
};