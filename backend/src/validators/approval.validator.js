const { z } = require('zod');

exports.approvalActionSchema = z.object({
    body: z.object({
        action: z.enum(['APPROVED', 'REJECTED', 'COMMENTED']),
        remarks: z.string().optional()
    })
});