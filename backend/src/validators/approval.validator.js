const { z } = require('zod');

exports.approvalActionSchema = z.object({
    body: z.object({
        action: z.enum(['APPROVED', 'REJECTED', 'COMMENTED', 'WITHDRAW']),
        remarks: z.string().optional()
    })
});