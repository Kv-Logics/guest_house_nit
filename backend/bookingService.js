const db = require('./db');

class BookingService {
    async submitBookingRequest(bookingData) {
        const { 
            user_id, guests, arrival_datetime, departure_datetime, rooms_required,
            purpose_of_visit, category_id, project_code, payment_responsibility,
            undertaking_accepted, visit_type, room_type, extra_beds, total_estimated_amount
        } = bookingData;

        // Obtain a dedicated client for transaction block
        const client = await db.getClient();
        
        // Normalize enums to avoid PostgreSQL case-sensitivity constraint errors
        const normalizedVisitType = String(visit_type).toLowerCase();
        const normalizedPaymentResp = String(payment_responsibility).toLowerCase();

        try {
            await client.query('BEGIN');

            // 1. Verify User
            const userRes = await client.query('SELECT * FROM users WHERE user_id = $1', [user_id]);
            if (userRes.rows.length === 0) throw new Error("Invalid applicant session.");
            const user = userRes.rows[0];

            // 2. Fetch Category Rules
            const categoryRes = await client.query('SELECT * FROM category_rules WHERE category_id = $1', [category_id]);
            
            if (categoryRes.rows.length === 0) throw new Error("Category not found");
            const category = categoryRes.rows[0];

            // 3. ENFORCE NITT RULES
            
            // Rule: Check allowed roles
            if (!category.allowed_applicant_roles.includes(user.role)) {
                throw new Error(`A ${user.role} is not eligible for ${category.category_code}.`);
            }

            // Rule: CAT II Project Code Requirement
            if (category.requires_project_code && !project_code) {
                throw new Error(`${category.category_code} requires a project code.`);
            }

            // Rule: Visit Type (Official vs Personal)
            if (category.visit_type !== 'both' && category.visit_type !== normalizedVisitType) {
                throw new Error(`${category.category_code} only allows ${category.visit_type} visits. (Received: ${normalizedVisitType})`);
            }

            // Rule: Cap Max Rooms and Guests
            if (rooms_required > category.max_rooms_allowed) {
                throw new Error(`Exceeds maximum allowed rooms (${category.max_rooms_allowed}).`);
            }
            if (guests.length > category.max_guest_count) {
                throw new Error(`Exceeds maximum allowed guests (${category.max_guest_count}).`);
            }

            // 4. Determine Approval Workflow Stage based on Category Engine
            let approval_state = 'PENDING_HOD';
            if (category_id === 1) approval_state = 'PENDING_REGISTRAR';
            if (category_id === 2) approval_state = 'PENDING_DEAN';
            if (category_id === 3) approval_state = 'PENDING_HOD'; 
            if (category_id === 4) approval_state = 'PENDING_REGISTRAR';
            
            let payment_state = 'PENDING';
            if (category_id === 1) payment_state = 'INSTITUTE_BILLED';

            // 6. Insert the Booking Request
            const insertQuery = `
                INSERT INTO booking_requests (
                    user_id, category_id, purpose_of_visit, 
                    visit_type, project_code, arrival_datetime, departure_datetime, 
                    rooms_required, undertaking_accepted, payment_responsible,
                    booking_state, approval_state, payment_state, room_type, extra_beds, total_estimated_amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING_APPROVAL', $11, $12, $13, $14, $15)
                RETURNING booking_id, booking_state
            `;
            
            const result = await client.query(insertQuery, [
                user.user_id, category_id, purpose_of_visit, 
                normalizedVisitType, project_code, arrival_datetime, departure_datetime, 
                rooms_required, undertaking_accepted, normalizedPaymentResp, 
                approval_state, payment_state, room_type || 'Standard Room', extra_beds || 0, total_estimated_amount || 0
            ]);

            const booking_id = result.rows[0].booking_id;

            // 6. Insert Guests and their Food Preferences
            for (const guest of guests) {
                const gRes = await client.query(`
                    INSERT INTO guests (booking_id, guest_name, designation, relation_to_applicant, phone, email, gender, age, address, identity_proof_type, identity_proof_number)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING guest_id
                `, [booking_id, guest.guest_name, guest.designation, guest.relation_to_applicant, guest.phone, guest.email, guest.gender, guest.age, guest.address, guest.id_proof_type, guest.id_proof_number]);
                
                const new_guest_id = gRes.rows[0].guest_id;
                
                if (guest.food_preferences && guest.food_preferences.length > 0) {
                    for (const meal of guest.food_preferences) {
                        await client.query(`
                            INSERT INTO guest_food_preferences (guest_id, meal_date, breakfast, lunch, dinner, remarks)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [new_guest_id, meal.date, meal.breakfast || 0, meal.lunch || 0, meal.dinner || 0, meal.remarks]);
                    }
                }
            }

            await client.query('COMMIT');
            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new BookingService();