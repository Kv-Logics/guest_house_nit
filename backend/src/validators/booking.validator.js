const { z } = require('zod');

exports.createBookingSchema = z.object({
    body: z.object({
        category_id: z.coerce.number().int().positive(),
        purpose_of_visit: z.string().min(5),
        visit_type: z.enum(['official', 'personal', 'both']),
        arrival_date: z.string().optional(),
        arrival_time: z.string().optional(),
        departure_date: z.string().optional(),
        departure_time: z.string().optional(),
        arrival_datetime: z.string().datetime().optional(),
        departure_datetime: z.string().datetime().optional(),
        rooms_required: z.coerce.number().int().positive(),
        undertaking_accepted: z.boolean().optional(),
        project_code: z.string().optional(),
        room_type: z.string().optional(),
        extra_beds: z.coerce.number().int().nonnegative().optional(),
        total_estimated_amount: z.coerce.number().nonnegative().optional(),
        payment_responsibility: z.string().optional(),
        assigned_approver_id: z.string().uuid('Please select a valid approving authority'),
        guests: z.array(z.object({
            guest_name: z.string(),
            designation: z.string().optional(),
            relation_to_applicant: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().email().optional().or(z.literal('')),
            gender: z.string().optional(),
            age: z.coerce.number().optional(),
            address: z.string().optional(),
            id_proof_type: z.string().optional(),
            id_proof_number: z.string().optional(),
            room_index: z.coerce.number().int().nonnegative().optional(),
            preferred_occupancy: z.string().optional(),
            preferred_extra_bed: z.boolean().optional(),
            food_preferences: z.array(z.object({
                date: z.string(), breakfast: z.coerce.number().optional(), lunch: z.coerce.number().optional(), dinner: z.coerce.number().optional(), remarks: z.string().optional()
            })).optional()
        })).optional()
    })
});

exports.stayExtensionSchema = z.object({
    body: z.object({
        guest_extensions: z.array(
            z.object({
                guest_id: z.string().uuid('Invalid guest id'),
                new_departure_datetime: z.string().datetime()
            })
        ).min(1, 'At least one guest extension is required')
    }),
    params: z.object({
        id: z.string().uuid('Invalid booking id'),
    }),
});