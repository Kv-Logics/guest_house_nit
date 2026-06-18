const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authRepository = require('../repositories/auth.repository');
const logger = require('../utils/logger');
const mailService = require('./mail.service');
const redis = require('../db/redis');

exports.requestOtp = async (email) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        // Silently return to prevent user enumeration
        logger.info(`OTP requested for non-existent email address (ignored silently)`);
        return;
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP using SHA-256 for secure storage
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Store the hashed OTP in Redis with 10 minutes (600 seconds) expiry
    await redis.set(`otp:${email}`, hashedOtp, 'EX', 600);

    // Send OTP via SMTP (relying only on environment variables as specified)
    try {
        await mailService.sendEmail({
            to: email,
            subject: 'Verify Your Login',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verify Your Login</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 24px; text-align: center; background-color: #4f46e5;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Guest House Portal</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 32px; border: 1px solid #e2e8f0; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #334155;">Hello,</p>
                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #334155;">Use the following One-Time Password (OTP) to complete your login:</p>
                                
                                <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                                    <tr>
                                        <td style="padding: 16px 32px; background-color: #f1f5f9; border: 2px dashed #4f46e5; border-radius: 8px; text-align: center;">
                                            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b;">[ ${otp} ]</span>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 20px; color: #4f46e5; font-weight: 600; text-align: center;">This OTP is valid for 10 minutes.</p>
                                <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 20px; color: #64748b;">If you did not request this login, please ignore this email.</p>
                                
                                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0 24px 0;">
                                <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b;">Regards,<br>Your Team</p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
            useEnvOnly: true
        });
        logger.info(`[MAIL DISPATCH] OTP email successfully dispatched to registration mailbox.`);
    } catch (err) {
        logger.error(`[OTP MAIL ERROR] Failed to send OTP to recipient: ${err.message}`);
    }
};

exports.verifyOtp = async (email, otp) => {
    const storedHashedOtp = await redis.get(`otp:${email}`);
    
    if (!storedHashedOtp) {
        logger.warn(`Failed login attempt: OTP not found or expired.`);
        throw new Error('OTP not requested or expired.');
    }

    const hashedInputOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (storedHashedOtp !== hashedInputOtp) {
        logger.warn(`Failed login attempt: Invalid OTP provided.`);
        throw new Error('Invalid OTP.');
    }

    // Invalidate/clear OTP immediately after successful verification to prevent reuse
    await redis.del(`otp:${email}`);

    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('User not found.');

    logger.info(`OTP Verified successfully`);

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