const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authRepository = require('../repositories/auth.repository');
const logger = require('../utils/logger');
const mailService = require('./mail.service');
const redis = require('../db/redis');

exports.requestOtp = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        throw new Error('User not found.');
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 5 minutes (300 seconds) expiry
    await redis.set(`otp:${email}`, otp, 'EX', 300);

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
    
    // Auto-fill OTP for testing (optional, depending on environment)
    return otp;
};

exports.verifyOtp = async (email, otp) => {
    const storedOtp = await redis.get(`otp:${email}`);
    
    if (!storedOtp) {
        logger.warn(`Failed login attempt for ${email}: OTP not found or expired.`);
        throw new Error('OTP not requested or expired.');
    }
    if (storedOtp !== otp) {
        logger.warn(`Failed login attempt for ${email}: Invalid OTP provided.`);
        throw new Error('Invalid OTP.');
    }

    // Clear OTP after successful use
    await redis.del(`otp:${email}`);

    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('User not found.');

    logger.info(`OTP Verified successfully for email: ${email}`);

    // Always return a setup token. The OTP flow acts as both "Setup Password" and "Forgot Password"
    const setupToken = jwt.sign(
        { id: user.user_id, email: user.email, action: 'setup_password' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    return {
        requirePasswordSetup: true,
        setupToken
    };
};

exports.setupPassword = async (userId, password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    await authRepository.updateUserPassword(userId, hash);
    logger.info(`Password set successfully for user ID: ${userId}`);
    return true;
};

exports.loginWithPassword = async (email, password) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('Invalid credentials.');

    if (!user.password_hash) {
        throw new Error('Password not set. Please use OTP to setup your password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        logger.warn(`Failed password login attempt for ${email}`);
        throw new Error('Invalid credentials.');
    }

    logger.info(`Successful password login for email: ${email}`);

    const token = jwt.sign(
        { 
            id: user.user_id,
            user_id: user.user_id,
            email: user.email, 
            role: user.role 
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
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