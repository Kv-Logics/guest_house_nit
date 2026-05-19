const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const logger = require('../utils/logger');

// In-memory store for OTPs (For production, this could be moved to Redis or a DB table)
const otpStore = new Map();

exports.requestOtp = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        throw new Error('User not found.');
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    otpStore.set(email, { otp, expiresAt });

    // Simulate sending an email (in production, integrate nodemailer/SendGrid here)
    logger.info(`[DEV-ONLY] OTP for ${email} is: ${otp}`);
    
    if (process.env.AUTO_FILL_OTP === 'true') {
        return otp;
    }
    return null;
};

exports.verifyOtp = async (email, otp) => {
    const stored = otpStore.get(email);
    
    if (!stored) {
        logger.warn(`Failed login attempt for ${email}: OTP not found or already used.`);
        throw new Error('OTP not requested or expired.');
    }
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        logger.warn(`Failed login attempt for ${email}: OTP expired.`);
        throw new Error('OTP has expired.');
    }
    if (stored.otp !== otp) {
        logger.warn(`Failed login attempt for ${email}: Invalid OTP provided.`);
        throw new Error('Invalid OTP.');
    }

    otpStore.delete(email); // Clear OTP after successful use

    logger.info(`Successful login for email: ${email}`);

    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('User not found.');

    const token = jwt.sign(
        { 
            id: user.user_id,          // Required payload
            user_id: user.user_id,     // Retained for backward compatibility with booking endpoints
            email: user.email, 
            role: user.role 
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }            // 7 Days expiration requirement
    );

    return {
        token,
        user: {
            id: user.user_id,
            user_id: user.user_id,
            name: user.full_name,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation
        }
    };
};

exports.getProfile = async (userId) => {
    const user = await authRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found.');
    }
    return {
        id: user.user_id,
        user_id: user.user_id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
    };
};

exports.getProfileByEmail = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        throw new Error('User not found.');
    }
    return {
        id: user.user_id,
        user_id: user.user_id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
    };
};