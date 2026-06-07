const billingService = require('../services/billing.service');
const { sendSuccess } = require('../utils/response');

exports.overrideBill = async (req, res, next) => {
    try {
        const data = await billingService.overrideBill(req.params.id, req.user.user_id, req.body);
        return sendSuccess(res, 'Bill overridden successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getAuditLogs = async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const data = await billingService.getAuditLogs(limit, offset);
        return sendSuccess(res, 'Billing audit logs retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};
