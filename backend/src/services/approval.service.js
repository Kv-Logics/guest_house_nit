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

        // Fetch booking details and approver's role
        const sel = await client.query(
            `SELECT b.booking_state, b.room_type, b.room_priority, b.pending_extension_datetime, 
                    r.role_name as applicant_role,
                    (SELECT rx.role_name FROM user_roles urx JOIN roles rx ON urx.role_id = rx.role_id WHERE urx.user_id = $2 LIMIT 1) as approver_role
             FROM booking_requests b
             JOIN users u ON b.user_id = u.user_id
             JOIN user_roles ur ON u.user_id = ur.user_id
             JOIN roles r ON ur.role_id = r.role_id
             WHERE b.booking_id = $1 FOR UPDATE`,
            [bookingId, approverId]
        );
        if (!sel.rows.length) throw new Error('Booking not found');

        const booking = sel.rows[0];
        const pendingExt = booking.pending_extension_datetime;
        const applicantRole = booking.applicant_role;
        const approverRole = booking.approver_role;

        let newState;
        let finalRemarks = remarks;

        if (approverRole === 'director') {
            if (action === 'APPROVED') {
                newState = BOOKING_STATUS.PENDING_ADMIN;
            } else {
                // Director rejected Suite Room
                const priorityStr = booking.room_priority || booking.room_type || '';
                const hasAlternatives = priorityStr.includes('Standard Room') || priorityStr.includes('Mini Suite Room');
                if (hasAlternatives) {
                    // Route to Admin/Reception instead of rejecting completely
                    newState = BOOKING_STATUS.PENDING_ADMIN;
                    finalRemarks = `[DIRECTOR DECLINED SUITE - REDIRECT TO ALTERNATIVE PRIORITY] ${remarks || ''}`;
                } else {
                    newState = BOOKING_STATUS.DIRECTOR_REJECTED;
                }
            }
        } else {
            // Standard Authority (HOD / Dean / Registrar / Faculty)
            if (action === 'APPROVED') {
                const requestedSuite = (booking.room_type === 'Suite Room') || (booking.room_priority && booking.room_priority.startsWith('Suite Room'));
                if (requestedSuite) {
                    newState = BOOKING_STATUS.PENDING_DIRECTOR;
                } else {
                    newState = BOOKING_STATUS.PENDING_ADMIN;
                }

                if (['super_admin', 'guest_house_admin'].includes(applicantRole) && !requestedSuite) {
                    newState = BOOKING_STATUS.ADMIN_APPROVED;
                }
            } else {
                newState = BOOKING_STATUS.APPROVER_REJECTED;
            }
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
            [bookingId, approverId, action, finalRemarks]
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