const { z } = require('zod');

exports.createBookingSchema = z.object({
    body: z.object({
        category_id: z.number().int().positive(),
        purpose_of_visit: z.string().min(5),
        visit_type: z.enum(['official', 'personal', 'both']),
        arrival_datetime: z.string().datetime(),
        departure_datetime: z.string().datetime(),
        rooms_required: z.number().int().positive(),
        undertaking_accepted: z.boolean(),
        guest_name: z.string().optional(),
        guest_phone: z.string().optional()
    })
});