const { z } = require('zod');

exports.verifyPaymentSchema = z.object({
    body: z.object({
        action: z.enum(['APPROVED', 'REJECTED']),
        reason: z.string().optional()
    }).refine((data) => data.action !== 'REJECTED' || (data.reason && data.reason.trim().length > 0), {
        message: "Rejection reason is mandatory when rejecting a payment.",
        path: ["reason"]
    })
});

exports.warningSchema = z.object({
    body: z.object({
        warning_level: z.number().int().min(1).max(3),
        message: z.string().min(5, "Warning message must be at least 5 characters.")
    })
});