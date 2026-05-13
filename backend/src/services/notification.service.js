const logger = require('../utils/logger');

// FUTURE-READY: Easily plug in Nodemailer, AWS SES, or Twilio here!

exports.sendPaymentWarning = async (bookingId, warningLevel, message) => {
    logger.info(`[NOTIFICATION] Sent WARNING LEVEL ${warningLevel} to applicant of Booking ${bookingId}: ${message}`);
};

exports.sendPaymentRejected = async (bookingId, reason) => {
    logger.info(`[NOTIFICATION] Payment REJECTED for Booking ${bookingId}. Reason: ${reason}`);
};

exports.sendPaymentApproved = async (bookingId) => {
    logger.info(`[NOTIFICATION] Payment APPROVED for Booking ${bookingId}.`);
};