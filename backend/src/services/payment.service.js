const db = require('../db/db');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../utils/constants');
const notificationService = require('./notification.service');

exports.uploadProof = async (bookingId, userId, file, remarks) => {
    if (!file) throw new Error('Payment proof file is required.');
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const bRes = await client.query('SELECT payment_state FROM booking_requests WHERE booking_id = $1 FOR UPDATE', [bookingId]);
        if (bRes.rows.length === 0) throw new Error('Booking not found');
        
        const currentState = bRes.rows[0].payment_state;
        const newState = currentState === PAYMENT_STATUS.REJECTED ? PAYMENT_STATUS.PROOF_RESUBMITTED : PAYMENT_STATUS.PROOF_SUBMITTED;
        const filePath = `uploads/payments/${file.filename}`;

        const proofRes = await client.query(`
            INSERT INTO payment_proofs (booking_id, uploaded_by_user_id, file_name, file_path, mime_type, file_size_bytes, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [bookingId, userId, file.originalname, filePath, file.mimetype, file.size, remarks || '']);

        await client.query(`UPDATE booking_requests SET payment_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2`, [newState, bookingId]);
        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, 
            [bookingId, userId, 'PAYMENT_PROOF_UPLOADED', 'Applicant uploaded payment proof.']);

        await client.query('COMMIT');
        return proofRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getProofHistory = async (bookingId) => {
    const bookingRes = await db.query('SELECT user_id FROM booking_requests WHERE booking_id = $1', [bookingId]);
    if (bookingRes.rows.length === 0) {
        return { proofs: [], warnings: [], userBookings: [] };
    }
    const userId = bookingRes.rows[0].user_id;

    const proofs = await db.query('SELECT p.*, u.full_name as reviewed_by FROM payment_proofs p LEFT JOIN users u ON p.reviewed_by_user_id = u.user_id WHERE p.booking_id = $1 ORDER BY p.created_at DESC', [bookingId]);
    
    // Fetch consolidated warnings across all bookings of the user
    const warnings = await db.query(`
        SELECT w.*, u.full_name as issued_by, br.booking_seq
        FROM payment_warnings w 
        LEFT JOIN users u ON w.issued_by_user_id = u.user_id 
        LEFT JOIN booking_requests br ON w.booking_id = br.booking_id
        WHERE br.user_id = $1 
        ORDER BY w.created_at DESC
    `, [userId]);

    // Fetch other bookings of the applicant
    const otherBookings = await db.query(`
        SELECT booking_id, booking_seq, booking_state, payment_state, total_estimated_amount, arrival_datetime, departure_datetime
        FROM booking_requests
        WHERE user_id = $1 AND booking_state != 'CANCELLED'
        ORDER BY created_at DESC
    `, [userId]);

    return { 
        proofs: proofs.rows, 
        warnings: warnings.rows,
        userBookings: otherBookings.rows
    };
};

exports.verifyPayment = async (bookingId, adminId, action, reason) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const latestProofRes = await client.query(`SELECT proof_id FROM payment_proofs WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [bookingId]);
        if (latestProofRes.rows.length === 0) throw new Error('No payment proof found to verify.');
        const proofId = latestProofRes.rows[0].proof_id;

        let newState = '';
        if (action === 'APPROVED') {
            newState = PAYMENT_STATUS.PAID;
            await client.query(`UPDATE payment_proofs SET status = 'APPROVED', reviewed_by_user_id = $1, reviewed_at = CURRENT_TIMESTAMP WHERE proof_id = $2`, [adminId, proofId]);
            await client.query(`
                UPDATE booking_requests 
                SET booking_state = CASE WHEN booking_state = $1 THEN $2 ELSE booking_state END,
                    payment_state = $3,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE booking_id = $4
            `, [BOOKING_STATUS.ADMIN_APPROVED, BOOKING_STATUS.READY_FOR_CHECKIN, newState, bookingId]);
        } else if (action === 'REJECTED') {
            newState = PAYMENT_STATUS.REJECTED;
            await client.query(`UPDATE payment_proofs SET status = 'REJECTED', rejection_reason = $1, reviewed_by_user_id = $2, reviewed_at = CURRENT_TIMESTAMP WHERE proof_id = $3`, [reason, adminId, proofId]);
            await client.query(`UPDATE booking_requests SET payment_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2`, [newState, bookingId]);
        }
        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, 
            [bookingId, adminId, `PAYMENT_${action}`, action === 'APPROVED' ? 'Payment proof verified and approved.' : `Payment rejected: ${reason}`]);

        await client.query('COMMIT');

        if (action === 'REJECTED') await notificationService.sendPaymentRejected(bookingId, reason);
        if (action === 'APPROVED') await notificationService.sendPaymentApproved(bookingId);

        return { status: newState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.sendWarning = async (bookingId, adminId, warningLevel, message) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        await client.query(`INSERT INTO payment_warnings (booking_id, issued_by_user_id, warning_level, message) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, warningLevel, message]);

        const stateMap = { 1: PAYMENT_STATUS.WARNING_1_SENT, 2: PAYMENT_STATUS.WARNING_2_SENT, 3: PAYMENT_STATUS.WARNING_3_SENT };
        const newState = stateMap[warningLevel] || `WARNING_${warningLevel}_SENT`;

        await client.query(`UPDATE booking_requests SET payment_state = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2`, [newState, bookingId]);
        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, 'PAYMENT_WARNING', `Sent warning level ${warningLevel}: ${message}`]);

        await client.query('COMMIT');
        await notificationService.sendPaymentWarning(bookingId, warningLevel, message);

        return { status: newState };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.posComplete = async (bookingId, adminId, posReference) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query(`
            UPDATE booking_requests 
            SET payment_state = $1, 
                pos_reference = $2,
                updated_at = CURRENT_TIMESTAMP 
            WHERE booking_id = $3
        `, ['PAYMENT_PENDING_CONFIRMATION', posReference, bookingId]);
        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, 'PAYMENT_POS_INITIATED', `POS/Online transaction initiated. Reference: ${posReference}. Waiting for bank confirmation.`]);
        await client.query('COMMIT');
        
        return { status: 'PAYMENT_PENDING_CONFIRMATION' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.posConfirm = async (bookingId, adminId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query(`
            UPDATE booking_requests 
            SET booking_state = CASE WHEN booking_state = $1 THEN $2 ELSE booking_state END,
                payment_state = $3, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE booking_id = $4
        `, [BOOKING_STATUS.ADMIN_APPROVED, BOOKING_STATUS.READY_FOR_CHECKIN, PAYMENT_STATUS.PAID, bookingId]);
        await client.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, 'PAYMENT_APPROVED', 'POS/Online payment confirmed reflected in bank. Stay finalized.']);
        await client.query('COMMIT');
        
        await notificationService.sendPaymentApproved(bookingId);
        return { status: PAYMENT_STATUS.PAID };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};