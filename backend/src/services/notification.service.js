const logger = require('../utils/logger');
const db = require('../db/db');
const mailService = require('./mail.service');

// Helper to fetch applicant details
async function getApplicantDetails(bookingId) {
    try {
        const query = `
            SELECT u.email, u.full_name, br.booking_seq, br.booking_state
            FROM booking_requests br
            JOIN users u ON br.user_id = u.user_id
            WHERE br.booking_id = $1
        `;
        const res = await db.query(query, [bookingId]);
        return res.rows[0] || null;
    } catch (err) {
        logger.error(`Error fetching applicant details for booking ${bookingId}: ${err.message}`, err);
        return null;
    }
}

exports.sendPaymentWarning = async (bookingId, warningLevel, message) => {
    logger.info(`[NOTIFICATION] Sent PAYMENT REMINDER ${warningLevel} to applicant of Booking ${bookingId}: ${message}`);
    const applicant = await getApplicantDetails(bookingId);
    if (!applicant || !applicant.email) return;

    try {
        await mailService.sendEmail({
            to: applicant.email,
            subject: `Payment Reminder (Notification #${warningLevel}) for Booking #${applicant.booking_seq}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #bae6fd; border-radius: 12px; background-color: #f0f9ff;">
                    <h2 style="color: #0369a1;">Payment Reminder</h2>
                    <p>Dear ${applicant.full_name},</p>
                    <p>This is a friendly reminder regarding the pending payment for your NITT Guest House Booking <strong>#${applicant.booking_seq}</strong>.</p>
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 15px 0; font-style: italic; color: #0c4a6e;">
                        "${message}"
                    </div>
                    <p>Please update or upload your payment details at your earliest convenience to finalize your stay.</p>
                    <p style="color: #4b5563; font-size: 12px; margin-top: 25px;">NITT Guest House Administration Office</p>
                </div>
            `
        });
    } catch (err) {
        logger.error(`Failed to send reminder email to ${applicant.email}: ${err.message}`);
    }
};

exports.sendPaymentRejected = async (bookingId, reason) => {
    logger.info(`[NOTIFICATION] Payment REJECTED for Booking ${bookingId}. Reason: ${reason}`);
    const applicant = await getApplicantDetails(bookingId);
    if (!applicant || !applicant.email) return;

    try {
        await mailService.sendEmail({
            to: applicant.email,
            subject: `Payment Verification Rejected - Booking #${applicant.booking_seq}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ef4444; border-radius: 12px;">
                    <h2 style="color: #dc2626;">Payment Proof Rejected</h2>
                    <p>Dear ${applicant.full_name},</p>
                    <p>The payment verification for your Booking <strong>#${applicant.booking_seq}</strong> has been rejected by the administrator.</p>
                    <p><strong>Reason for rejection:</strong></p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic;">
                        "${reason}"
                    </div>
                    <p>Please upload a valid receipt or proof of payment through your dashboard as soon as possible.</p>
                    <p style="color: #4b5563; font-size: 12px; margin-top: 25px;">NITT Guest House Administration Office</p>
                </div>
            `
        });
    } catch (err) {
        logger.error(`Failed to send payment rejection email to ${applicant.email}: ${err.message}`);
    }
};

exports.sendPaymentApproved = async (bookingId) => {
    logger.info(`[NOTIFICATION] Payment APPROVED for Booking ${bookingId}.`);
    const applicant = await getApplicantDetails(bookingId);
    if (!applicant || !applicant.email) return;

    try {
        await mailService.sendEmail({
            to: applicant.email,
            subject: `Payment Approved & Booking Confirmed - Booking #${applicant.booking_seq}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #10b981; border-radius: 12px; background-color: #ecfdf5;">
                    <h2 style="color: #059669;">Payment Confirmed!</h2>
                    <p>Dear ${applicant.full_name},</p>
                    <p>Great news! The administrator has successfully verified your payment proof for Booking <strong>#${applicant.booking_seq}</strong>.</p>
                    <p>Your booking is now confirmed and ready for check-in.</p>
                    <p style="color: #4b5563; font-size: 12px; margin-top: 25px;">NITT Guest House Administration Office</p>
                </div>
            `
        });
    } catch (err) {
        logger.error(`Failed to send payment approved email to ${applicant.email}: ${err.message}`);
    }
};

exports.sendApprovalStateChange = async (bookingId, newState, remarks) => {
    logger.info(`[NOTIFICATION] Stage status update for Booking ${bookingId}: ${newState}`);
    const applicant = await getApplicantDetails(bookingId);
    if (!applicant || !applicant.email) return;

    let subject = `Booking Update: Request #${applicant.booking_seq}`;
    let title = "Booking Status Update";
    let message = `Your Guest House booking request status has changed to: <strong>${newState.replace(/_/g, ' ')}</strong>.`;
    let isRejection = newState.includes('REJECTED');

    if (newState === 'PENDING_APPROVER') {
        subject = `Booking Request Submitted - #${applicant.booking_seq}`;
        title = "Booking Submitted Successfully";
        message = `Your booking request has been submitted and is currently pending review by your HOD / Coordinator.`;
    } else if (newState === 'PENDING_DIRECTOR') {
        subject = `Director Approval Pending - Booking #${applicant.booking_seq}`;
        title = "Pending Director Approval";
        message = `Your booking request requires Director approval (for Suite Room requests). It has been HOD-approved and forwarded to the Director.`;
    } else if (newState === 'PENDING_ADMIN') {
        subject = `Admin Approval Pending - Booking #${applicant.booking_seq}`;
        title = "Pending Admin Verification";
        message = `Your booking request has cleared initial approvals and is now pending Guest House Admin approval.`;
    } else if (newState === 'ADMIN_APPROVED') {
        subject = `Booking Request Approved! - Booking #${applicant.booking_seq}`;
        title = "Booking Approved";
        message = `Congratulations! Your booking request has been approved by the Admin. Please log into your dashboard and proceed to upload payment proof to confirm your stays.`;
    } else if (isRejection) {
        subject = `Booking Request Rejected - Booking #${applicant.booking_seq}`;
        title = "Booking Rejected";
        message = `Unfortunately, your booking request has been rejected by the approval authority.`;
    }

    try {
        await mailService.sendEmail({
            to: applicant.email,
            subject,
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; ${isRejection ? 'border-top: 4px solid #ef4444;' : 'border-top: 4px solid #4f46e5;'}">
                    <h2 style="color: ${isRejection ? '#dc2626' : '#4f46e5'}; margin-top: 0;">${title}</h2>
                    <p>Dear ${applicant.full_name},</p>
                    <p>${message}</p>
                    ${remarks ? `
                    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 13px; font-style: italic; color: #4b5563; margin-top: 15px;">
                        "Remarks: ${remarks}"
                    </div>` : ''}
                    <p style="margin-top: 20px;">Please visit your Guest House Portal dashboard to view the full details or request modifications.</p>
                    <p style="color: #4b5563; font-size: 12px; margin-top: 25px;">NITT Guest House Administration Office</p>
                </div>
            `
        });
    } catch (err) {
        logger.error(`Failed to send approval state email to ${applicant.email}: ${err.message}`);
    }
};

exports.sendBulkBookingNotification = async (bookingId, action, details) => {
    logger.info(`[NOTIFICATION] BULK BOOKING ${action} for Booking ${bookingId}: ${details}`);
};