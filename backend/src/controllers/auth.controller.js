const authService = require('../services/auth.service');
const authRepository = require('../repositories/auth.repository');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

exports.requestOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        logger.info(`OTP requested for email: ${email}`);
        await authService.requestOtp(email);
        
        return sendSuccess(res, 'OTP sent successfully to your email');
    } catch (error) {
        next(error);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const data = await authService.verifyOtp(email, otp);
        
        if (data.requirePasswordSetup) {
            return sendSuccess(res, 'OTP verified. Please setup your password.', {
                requirePasswordSetup: true,
                setupToken: data.setupToken
            });
        }

        // Set JWT inside an HTTP-Only secure cookie
        res.cookie('token', data.token, {
            httpOnly: true,  // Prevents JavaScript/XSS access to the token
            secure: process.env.COOKIE_SECURE === 'true', // Set COOKIE_SECURE=true in .env.production when HTTPS is live
            sameSite: 'strict', // Protects against CSRF attacks
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days expiration
        });

        // Do not send the token in the JSON body anymore!
        return sendSuccess(res, 'Login successful', { user: data.user });
    } catch (error) {
        const authErrors = ['Invalid OTP.', 'OTP has expired.', 'OTP not requested or expired.'];
        if (authErrors.includes(error.message)) {
            return sendError(res, error.message, 401);
        }
        next(error);
    }
};

exports.setupPassword = async (req, res, next) => {
    try {
        const { setupToken, password } = req.body;

        if (!setupToken || !password) {
            return sendError(res, 'Setup token and password are required', 400);
        }

        let decoded;
        try {
            decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
            if (decoded.action !== 'setup_password') {
                throw new Error('Invalid token action');
            }
        } catch (err) {
            return sendError(res, 'Invalid or expired setup token', 401);
        }

        await authService.setupPassword(decoded.id, password);

        // Optional: Log them in automatically after setup
        const data = await authService.loginWithPassword(decoded.email, password);

        res.cookie('token', data.token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return sendSuccess(res, 'Password set successfully', { user: data.user });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const data = await authService.loginWithPassword(email, password);

        res.cookie('token', data.token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return sendSuccess(res, 'Login successful', { user: data.user });
    } catch (error) {
        if (error.message === 'Invalid credentials.' || error.message === 'Password not set. Please use OTP to setup your password.') {
            return sendError(res, error.message, 401);
        }
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        // Clear the cookie securely
        res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
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
        let token = req.cookies?.token;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        
        if (!token) {
            return sendError(res, 'Unauthorized access. Token missing.', 401);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const freshToken = jwt.sign(
                { 
                    id: decoded.id,          
                    user_id: decoded.user_id,
                    email: decoded.email, 
                    role: decoded.role 
                }, 
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', freshToken, {
                httpOnly: true,
                secure: process.env.COOKIE_SECURE === 'true',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return sendSuccess(res, 'Token refreshed successfully', { token: freshToken });
        } catch (err) {
            return sendError(res, 'Invalid or expired token.', 401);
        }
    } catch (error) {
        next(error);
    }
};

exports.checkUserStatus = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return sendError(res, 'Username or email is required', 400);
        }
        const user = await authRepository.findUserByEmail(email);
        if (!user) {
            // Return dummy status indicating password setup exists to prevent email enumeration
            return sendSuccess(res, 'User status checked', { hasPassword: true });
        }
        const hasPassword = !!user.password_hash;
        return sendSuccess(res, 'User status checked', { hasPassword });
    } catch (error) {
        next(error);
    }
};