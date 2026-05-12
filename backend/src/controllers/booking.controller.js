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
        const data = await bookingService.getAllBookingsForAdmin();
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
        const { status } = req.body;
        const data = await bookingService.updateAdminStatus(req.params.id, status);
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
        const data = await bookingService.requestStayExtension(req.params.id, applicantId, req.body.new_departure_datetime);
        return sendSuccess(res, 'Stay extension request submitted', data);
    } catch (error) {
        next(error);
    }
};

exports.getAuthorities = async (req, res, next) => {
    try {
        const data = await bookingService.getAuthorities(req.query.category_id);
        return sendSuccess(res, 'Authorities retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};