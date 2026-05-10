const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response');

exports.requestOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.requestOtp(email);
        
        return sendSuccess(res, 'OTP sent successfully to your email');
    } catch (error) {
        if (error.message === 'User not found.') {
            return sendError(res, 'User not found. Please contact administration.', 404);
        }
        next(error);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const data = await authService.verifyOtp(email, otp);
        
        return sendSuccess(res, 'Login successful', data);
    } catch (error) {
        const authErrors = ['Invalid OTP.', 'OTP has expired.', 'OTP not requested or expired.'];
        if (authErrors.includes(error.message)) {
            return sendError(res, error.message, 401);
        }
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        res.clearCookie('token');
        return sendSuccess(res, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user.user_id;
        const profile = await authService.getProfile(userId);
        
        return sendSuccess(res, 'Profile retrieved', profile);
    } catch (error) {
        if (error.message === 'User not found.') {
            return sendError(res, 'User not found.', 404);
        }
        next(error);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        // Extensible for future refresh-token implementations
        return sendSuccess(res, 'Token refreshed', { token: req.cookies?.token || null });
    } catch (error) {
        next(error);
    }
};