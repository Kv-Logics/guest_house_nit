const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../utils/response');

exports.uploadProof = async (req, res, next) => {
    try {
        const data = await paymentService.uploadProof(req.params.id, req.user.user_id, req.file, req.body.remarks);
        return sendSuccess(res, 'Payment proof uploaded successfully', data, 201);
    } catch (error) {
        next(error);
    }
};

exports.getProofHistory = async (req, res, next) => {
    try {
        const data = await paymentService.getProofHistory(req.params.id);
        return sendSuccess(res, 'Payment history retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { action, reason } = req.body;
        const data = await paymentService.verifyPayment(req.params.id, req.user.user_id, action, reason);
        return sendSuccess(res, `Payment proof ${action.toLowerCase()} successfully`, data);
    } catch (error) {
        next(error);
    }
};

exports.sendWarning = async (req, res, next) => {
    try {
        const { warning_level, message } = req.body;
        const data = await paymentService.sendWarning(req.params.id, req.user.user_id, warning_level, message);
        return sendSuccess(res, `Warning level ${warning_level} sent successfully`, data);
    } catch (error) {
        next(error);
    }
};

exports.posComplete = async (req, res, next) => {
    try {
        const data = await paymentService.posComplete(req.params.id, req.user.user_id);
        return sendSuccess(res, 'POS Payment recorded', data);
    } catch (error) {
        next(error);
    }
};