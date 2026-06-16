const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const logger = require('../utils/logger');
const mailService = require('./mail.service');

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

    // Send OTP via SMTP (relying only on environment variables as specified)
    try {
        await mailService.sendEmail({
            to: email,
            subject: 'Guest House Login Verification OTP',
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
                    <h2 style="color: #4f46e5;">Verification Code</h2>
                    <p>Dear User,</p>
                    <p>Use the following One-Time Password (OTP) to access your NITT Guest House account. This code is valid for 5 minutes:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email.</p>
                </div>
            `,
            useEnvOnly: true
        });
    } catch (err) {
        logger.error(`[OTP MAIL ERROR] Failed to send OTP to ${email}: ${err.message}`);
    }

    logger.info(`[DEV-ONLY] OTP for ${email} is: ${otp}`);
    
    // Auto-fill OTP for testing
    return otp;
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
            faculty_name: user.full_name,
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
        faculty_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
    };
};