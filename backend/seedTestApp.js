const db = require('./src/db/db');

async function seedTestApp() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Ensure there is a user
        const userRes = await client.query(`
            INSERT INTO users (full_name, email, employee_id, is_active)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE SET is_active = EXCLUDED.is_active
            RETURNING user_id
        `, ['Test Applicant', 'testapp@example.com', 'EMP999', true]);
        const userId = userRes.rows[0].user_id;

        // Insert booking request
        const bRes = await client.query(`
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type,
                arrival_datetime, departure_datetime, rooms_required,
                undertaking_accepted, booking_state
            ) VALUES (
                $1, 1, 'Official Meeting', 'official',
                '2026-05-23 10:00:00', '2026-05-25 10:00:00', 3,
                true, 'ADMIN_APPROVED'
            ) RETURNING booking_id
        `, [userId]);
        const bookingId = bRes.rows[0].booking_id;

        // Guests
        const guests = [
            // Room 1: 3 guests
            { name: 'Guest 1_1', room_index: 0, arr: '2026-05-23 10:00:00', dep: '2026-05-25 10:00:00' },
            { name: 'Guest 1_2', room_index: 0, arr: '2026-05-23 12:00:00', dep: '2026-05-25 10:00:00' },
            { name: 'Guest 1_3', room_index: 0, arr: '2026-05-24 09:00:00', dep: '2026-05-25 10:00:00' },
            // Room 2: 2 guests
            { name: 'Guest 2_1', room_index: 1, arr: '2026-05-23 10:00:00', dep: '2026-05-24 10:00:00' },
            { name: 'Guest 2_2', room_index: 1, arr: '2026-05-23 14:00:00', dep: '2026-05-25 10:00:00' },
            // Room 3: 1 guest
            { name: 'Guest 3_1', room_index: 2, arr: '2026-05-23 18:00:00', dep: '2026-05-25 10:00:00' }
        ];

        for (const g of guests) {
            await client.query(`
                INSERT INTO guests (
                    booking_id, guest_name, relation_to_applicant,
                    arrival_datetime, departure_datetime, room_index
                ) VALUES ($1, $2, 'Colleague', $3, $4, $5)
            `, [bookingId, g.name, g.arr, g.dep, g.room_index]);
        }

        await client.query('COMMIT');
        console.log('Seeded successfully with Booking ID:', bookingId);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error seeding:', e);
    } finally {
        client.release();
        process.exit();
    }
}

seedTestApp();
