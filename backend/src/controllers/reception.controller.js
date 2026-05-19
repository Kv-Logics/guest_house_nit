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
        const data = await receptionService.checkIn(req.params.id, req.body.allocated_room_numbers);
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

exports.updateGuestTimes = async (req, res, next) => {
    try {
        const { arrival_datetime, departure_datetime, pending_extension_datetime } = req.body;
        const data = await receptionService.updateGuestTimes(req.params.guestId, arrival_datetime, departure_datetime, pending_extension_datetime);
        return sendSuccess(res, 'Guest stay times updated successfully', data);
    } catch (error) {
        next(error);
    }
};