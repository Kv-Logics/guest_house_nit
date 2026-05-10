const receptionService = require('../services/reception.service');
const { sendSuccess } = require('../utils/response');

exports.getTodayArrivals = async (req, res, next) => {
    try {
        const data = await receptionService.getTodayArrivals();
        return sendSuccess(res, 'Today arrivals retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.checkIn = async (req, res, next) => {
    try {
        const data = await receptionService.checkIn(req.params.id);
        return sendSuccess(res, 'Guest checked in successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.checkOut = async (req, res, next) => {
    try {
        const data = await receptionService.checkOut(req.params.id);
        return sendSuccess(res, 'Guest checked out successfully', data);
    } catch (error) {
        next(error);
    }
};