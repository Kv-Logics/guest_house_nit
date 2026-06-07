const receptionService = require('../services/reception.service');
const { sendSuccess } = require('../utils/response');

exports.getTodayArrivals = async (req, res, next) => {
    try {
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const data = await receptionService.getTodayArrivals(overrideNow);
        return sendSuccess(res, 'Today arrivals retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.assignRooms = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const data = await receptionService.assignRooms(req.params.id, req.body.allocated_room_numbers, userId);
        return sendSuccess(res, 'Rooms assigned successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.checkInGuest = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const data = await receptionService.checkInGuest(req.params.guestId, userId, overrideNow);
        return sendSuccess(res, 'Guest checked in successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.checkIn = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const data = await receptionService.checkIn(req.params.id, req.body.allocated_room_numbers, userId, overrideNow);
        return sendSuccess(res, 'Guest checked in successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.checkOut = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const userRole = req.user?.role;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        
        const payload = {
            force: req.body?.force === true,
            forceReason: req.body?.forceReason || '',
            userRole,
            userId
        };

        const data = await receptionService.checkOut(req.params.id, userId, overrideNow, payload);
        return sendSuccess(res, 'Guest checked out successfully', data);
    } catch (error) {
        if (error.status === 402 || error.message === 'PAYMENT_REQUIRED') {
            return res.status(402).json({ success: false, message: 'PAYMENT_REQUIRED' });
        }
        next(error);
    }
};

exports.checkOutStay = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const userRole = req.user?.role;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        
        const payload = {
            force: req.body?.force === true,
            forceReason: req.body?.forceReason || '',
            userRole,
            userId
        };

        const data = await receptionService.checkOutStay(req.params.stayId, userId, overrideNow, payload);
        return sendSuccess(res, 'Guest stay checked out successfully', data);
    } catch (error) {
        if (error.status === 402 || error.message === 'PAYMENT_REQUIRED') {
            return res.status(402).json({ success: false, message: 'PAYMENT_REQUIRED' });
        }
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

exports.getRoomsWithStays = async (req, res, next) => {
    try {
        const data = await receptionService.getRoomsWithStays();
        return sendSuccess(res, 'Rooms and stays retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.updateRoomStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const data = await receptionService.updateRoomStatus(req.params.roomNumber, status);
        return sendSuccess(res, 'Room status updated successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.roomTransfer = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const { stayId, newRoomNumber, remarks } = req.body;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const data = await receptionService.roomTransfer(stayId, newRoomNumber, userId, remarks, overrideNow);
        return sendSuccess(res, 'Room transfer completed successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.overrideStayBilling = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const { stayId, newRoomType, newOccupancy, newTariff, newExtraBed, overrideReason } = req.body;
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const data = await receptionService.overrideStayBilling({
            stayId,
            newRoomType,
            newOccupancy,
            newTariff,
            newExtraBed,
            overrideReason,
            overriddenBy: userId,
            overrideNow
        });
        return sendSuccess(res, 'Billing overridden successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getBillingOverrideLogsByBooking = async (req, res, next) => {
    try {
        const data = await receptionService.getBillingOverrideLogsByBooking(req.params.bookingId);
        return sendSuccess(res, 'Billing override logs retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};
exports.extendStay = async (req, res, next) => {
    try {
        const { departure_datetime } = req.body;
        const data = await receptionService.extendStay(req.params.bookingId, departure_datetime);
        return sendSuccess(res, 'Stay extended successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getRoomHistory = async (req, res, next) => {
    try {
        const { roomNumber } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const data = await receptionService.getRoomHistory(roomNumber, page, limit);
        return sendSuccess(res, 'Room history retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// --- NEW POS / BILLING & BULK ROOM LOGIC ---

exports.getInstitutionConfig = async (req, res, next) => {
    try {
        const data = await receptionService.getInstitutionConfig();
        return sendSuccess(res, 'Institution config retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.updateInstitutionConfig = async (req, res, next) => {
    try {
        const data = await receptionService.updateInstitutionConfig(req.body);
        return sendSuccess(res, 'Institution config updated successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getPendingPayments = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const search = req.query.search || null;
        const monthFilter = req.query.month_filter || null;
        const overrideNow = req.headers['x-mock-date'] || req.query.overrideNow || null;
        const data = await receptionService.getPendingPayments(limit, offset, search, monthFilter, overrideNow);
        return sendSuccess(res, 'Pending payments retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getCompletedPayments = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const search = req.query.search || null;
        const monthFilter = req.query.month_filter || null;
        const overrideNow = req.headers['x-mock-date'] || req.query.overrideNow || null;
        const data = await receptionService.getCompletedPayments(limit, offset, search, monthFilter, overrideNow);
        return sendSuccess(res, 'Completed payments retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.confirmPayment = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const data = await receptionService.confirmPayment(req.params.bookingId, req.body, userId);
        return sendSuccess(res, 'Payment confirmed successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getActiveBulkBlocks = async (req, res, next) => {
    try {
        const data = await receptionService.getActiveBulkBlocks();
        return sendSuccess(res, 'Active bulk blocks retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.createBulkBlock = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const data = await receptionService.createBulkBlock(req.body, userId);
        return sendSuccess(res, 'Bulk block created successfully', { booking_id: data });
    } catch (error) {
        next(error);
    }
};

exports.checkInBulkGuest = async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id;
        const { bookingId, roomId } = req.params;
        const data = await receptionService.checkInBulkGuest(bookingId, roomId, req.body, userId);
        return sendSuccess(res, 'Bulk guest checked in successfully', data);
    } catch (error) {
        next(error);
    }
};