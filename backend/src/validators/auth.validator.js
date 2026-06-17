const { z } = require('zod');

exports.requestOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address')
    })
});

exports.verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        otp: z.string().length(6, 'OTP must be exactly 6 digits')
    })
});

exports.setupPasswordSchema = z.object({
    body: z.object({
        setupToken: z.string().min(1, 'Setup token is required'),
        password: z.string().min(8, 'Password must be at least 8 characters long')
    })
});

exports.loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required')
    })
});