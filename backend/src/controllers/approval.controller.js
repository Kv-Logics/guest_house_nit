const approvalService = require('../services/approval.service');
const { sendSuccess } = require('../utils/response');

exports.getPendingApprovals = async (req, res, next) => {
    try {
        // DYNAMIC ROLE INJECTION: The service evaluates the queue based on the viewer's exact authority
        const userRole = req.user.role;
        const userId = req.user.user_id || req.user.id;
        const queue = await approvalService.getPendingApprovals(userRole, userId);
        
        return sendSuccess(res, 'Queue retrieved dynamically via matrix', queue);
    } catch (error) {
        next(error);
    }
};

exports.approveBooking = async (req, res, next) => {
    try {
        const { action, remarks } = req.body;
        const data = await approvalService.approveBooking(req.params.id, req.user.user_id, action, remarks);
        
        return sendSuccess(res, `Booking correctly transitioned to ${data.booking_state}`, data);
    } catch (error) {
        next(error);
    }
};