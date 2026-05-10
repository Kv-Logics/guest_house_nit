const db = require('../db/db');
const approvalRepository = require('../repositories/approval.repository');
const { BOOKING_STATUS } = require('../utils/constants');

exports.getPendingApprovals = async (userRole, userId) => {
    return await approvalRepository.getPendingApprovalsByRole(BOOKING_STATUS.PENDING_APPROVER, userRole, userId);
};

exports.approveBooking = async (bookingId, approverId, action, remarks) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Enforce state transitions
        const newState = action === 'APPROVED' ? BOOKING_STATUS.PENDING_ADMIN : BOOKING_STATUS.APPROVER_REJECTED;

        // 1. Advance the State Machine
        const updateQuery = `
            UPDATE booking_requests
            SET booking_state = $1, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2
            RETURNING *
        `;
        const bookingRes = await client.query(updateQuery, [newState, bookingId]);
        if (bookingRes.rows.length === 0) throw new Error('Booking not found');

        // 2. Audit Trail creation
        await client.query(
            `INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, 
            [bookingId, approverId, action, remarks]
        );

        await client.query('COMMIT');
        return bookingRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};