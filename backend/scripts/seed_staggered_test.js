const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'guest_house',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Seeding staggered arrivals test case...");

        // 1. Get a random user
        const userRes = await client.query(`SELECT user_id FROM users LIMIT 1`);
        if (userRes.rows.length === 0) throw new Error("No users found");
        const userId = userRes.rows[0].user_id;

        // 2. Insert booking request (APPROVED)
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const day3 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const day5 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
        
        // Rooms required: 3
        const bRes = await client.query(`
            INSERT INTO booking_requests 
            (user_id, category_id, purpose_of_visit, visit_type, arrival_datetime, departure_datetime, rooms_required, room_type, undertaking_accepted, booking_state, allocated_room_numbers)
            VALUES ($1, 1, 'Staggered Testing', 'official', $2, $3, 3, 'Standard Room', true, 'ADMIN_APPROVED', null)
            RETURNING booking_id
        `, [userId, tomorrow, day5]);
        const bookingId = bRes.rows[0].booking_id;

        console.log(`Created Booking: ${bookingId}`);

        // 3. Guests: 6 total
        // Room 0: 3 guests (Arrives tomorrow)
        // Room 1: 2 guests (Arrives day 3)
        // Room 2: 1 guest (Arrives now - so we can check them in immediately)

        const guestsData = [
            { name: "John Doe (R1 G1)", room: 0, arrival: tomorrow, dep: day5 },
            { name: "Jane Doe (R1 G2)", room: 0, arrival: tomorrow, dep: day5 },
            { name: "Jimmy Doe (R1 G3)", room: 0, arrival: tomorrow, dep: day5 },
            { name: "Bob Smith (R2 G1)", room: 1, arrival: day3, dep: day5 },
            { name: "Alice Smith (R2 G2)", room: 1, arrival: day3, dep: day5 },
            { name: "Charlie Brown (R3 G1)", room: 2, arrival: now, dep: day5 },
        ];

        for (const g of guestsData) {
            await client.query(`
                INSERT INTO guests 
                (booking_id, guest_name, relation_to_applicant, room_index, arrival_datetime, departure_datetime, preferred_occupancy)
                VALUES ($1, $2, 'Guest', $3, $4, $5, 'single')
            `, [bookingId, g.name, g.room, g.arrival, g.dep]);
        }

        await client.query('COMMIT');
        console.log("Successfully seeded staggered arrivals test! Booking is in 'Received Applications' waiting for room assignment.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
