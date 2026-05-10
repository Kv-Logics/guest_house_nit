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