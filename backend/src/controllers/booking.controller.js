const bookingService = require('../services/booking.service');
const { sendSuccess } = require('../utils/response');

exports.createBooking = async (req, res, next) => {
    try {
        // Inject user_id and uploaded files from the authenticated context
        const requestData = { ...req.body, user_id: req.user.user_id, files: req.files };
        const data = await bookingService.submitBookingRequest(requestData);
        
        return sendSuccess(res, 'Booking request submitted successfully', data, 201);
    } catch (error) {
        next(error);
    }
};

exports.getMyBookings = async (req, res, next) => {
    try {
        const data = await bookingService.getBookingsByUser(req.user.user_id);
        return sendSuccess(res, 'My bookings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getAllBookingsForAdmin = async (req, res, next) => {
    try {
        const { limit = 20, offset = 0, status, search, month_filter, sortBy } = req.query;
        const parsedLimit = parseInt(limit, 10);
        const parsedOffset = parseInt(offset, 10);
        
        const data = await bookingService.getAllBookingsForAdmin(parsedLimit, parsedOffset, status, search, month_filter, sortBy);
        return sendSuccess(res, 'Admin bookings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getTariffs = async (req, res, next) => {
    try {
        const data = await bookingService.getTariffs();
        return sendSuccess(res, 'Tariffs retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.mockPayment = async (req, res, next) => {
    try {
        const data = await bookingService.mockPayment(req.params.id);
        return sendSuccess(res, 'Payment successful', data);
    } catch (error) {
        next(error);
    }
};

exports.updateAdminStatus = async (req, res, next) => {
    try {
        const { status, remarks } = req.body;
        const data = await bookingService.updateAdminStatus(req.params.id, status, remarks, req.user.user_id);
        return sendSuccess(res, `Booking transitioned to ${data.booking_state}`, data);
    } catch (error) {
        next(error);
    }
};

exports.getBookingById = async (req, res, next) => {
    try {
        const data = await bookingService.getBookingById(req.params.id);
        return sendSuccess(res, 'Booking details retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.cancelBooking = async (req, res, next) => {
    try {
        const data = await bookingService.cancelBooking(req.params.id, req.user);
        return sendSuccess(res, 'Booking withdrawn successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.requestStayExtension = async (req, res, next) => {
    try {
        const applicantId = req.user.user_id || req.user.id;
        const data = await bookingService.requestStayExtension(req.params.id, applicantId, req.body.guest_extensions);
        return sendSuccess(res, 'Stay extension request submitted', data);
    } catch (error) {
        next(error);
    }
};

exports.getAuthorities = async (req, res, next) => {
    try {
        const data = await bookingService.getAuthorities(req.query.category_id, req.user.role);
        return sendSuccess(res, 'Authorities retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.editBooking = async (req, res, next) => {
    try {
        req.body.user_id = req.user.user_id || req.user.id;
        req.body.role = req.user.role;
        req.body.files = req.files;
        req.body.booking_id = req.params.id;
        const data = await bookingService.editBookingRequest(req.body);
        return sendSuccess(res, 'Booking updated successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.reapplyBooking = async (req, res, next) => {
    try {
        req.body.user_id = req.user.user_id;
        req.body.files = req.files;
        req.body.booking_id = req.params.id;
        const data = await bookingService.reapplyBookingRequest(req.body);
        return sendSuccess(res, 'Booking reapplied successfully', data);
    } catch (error) {
        next(error);
    }
};

exports.getBookingHistory = async (req, res, next) => {
    try {
        const data = await bookingService.getBookingHistory(req.params.id);
        return sendSuccess(res, 'Booking history retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};