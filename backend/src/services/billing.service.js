const billingRepository = require('../repositories/billing.repository');
const { AppError } = require('../utils/errorHandler');

exports.overrideBill = async (bookingId, adminId, overrideData) => {
    const { subtotal, gst, total, reason } = overrideData;
    
    if (!reason || reason.trim() === '') {
        throw new AppError('A reason must be provided for bill overrides', 400);
    }
    
    // Validate the bill exists
    const currentBill = await billingRepository.getFinalBill(bookingId);
    if (!currentBill) {
        throw new AppError('No final bill found for this booking to override', 404);
    }
    
    return await billingRepository.overrideFinalBill(bookingId, currentBill, { subtotal, gst, total }, reason, adminId);
};

exports.getAuditLogs = async (limit = 50, offset = 0) => {
    return await billingRepository.getAuditLogs(limit, offset);
};
