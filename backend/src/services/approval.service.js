const db = require('../db/db');
const approvalRepository = require('../repositories/approval.repository');
const { BOOKING_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

exports.getPendingApprovals = async (userRole, userId) => {
    return await approvalRepository.getPendingApprovalsByRole(BOOKING_STATUS.PENDING_APPROVER, userRole, userId);
};

exports.approveBooking = async (bookingId, approverId, action, remarks) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const sel = await client.query(
            `SELECT b.pending_extension_datetime, r.role_name as applicant_role 
             FROM booking_requests b
             JOIN users u ON b.user_id = u.user_id
             JOIN user_roles ur ON u.user_id = ur.user_id
             JOIN roles r ON ur.role_id = r.role_id
             WHERE b.booking_id = $1 FOR UPDATE`,
            [bookingId]
        );
        if (!sel.rows.length) throw new Error('Booking not found');

        const pendingExt = sel.rows[0].pending_extension_datetime;
        const applicantRole = sel.rows[0].applicant_role;

        let newState =
            action === 'APPROVED' ? BOOKING_STATUS.PENDING_ADMIN : BOOKING_STATUS.APPROVER_REJECTED;
            
        if (action === 'APPROVED' && ['super_admin', 'guest_house_admin'].includes(applicantRole)) {
            newState = BOOKING_STATUS.ADMIN_APPROVED;
        }

        if (action === 'REJECTED' && pendingExt != null) {
            newState = BOOKING_STATUS.CHECKED_IN;
        }

        let bookingRes;
        if (action === 'REJECTED' && pendingExt != null) {
            bookingRes = await client.query(
                `
            UPDATE booking_requests
            SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2
            RETURNING *
        `,
                [newState, bookingId]
            );
        } else if (action === 'APPROVED' && pendingExt != null) {
            // Stay extension: keep pending_extension_datetime until admin applies dates in updateAdminStatus.
            bookingRes = await client.query(
                `
            UPDATE booking_requests
            SET booking_state = $1, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2
            RETURNING *
        `,
                [newState, bookingId]
            );
        } else {
            // Normal queue: clear any stray pending_extension_datetime when advancing to admin.
            bookingRes = await client.query(
                `
            UPDATE booking_requests
            SET booking_state = $1, pending_extension_datetime = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $2
            RETURNING *
        `,
                [newState, bookingId]
            );
        }
        if (bookingRes.rows.length === 0) throw new Error('Booking not found');

        await client.query(
            `INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`,
            [bookingId, approverId, action, remarks]
        );

        logger.info(`Booking approval action taken`, {
            bookingId,
            approverId,
            action,
            newState,
        });
        await client.query('COMMIT');
        return bookingRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};