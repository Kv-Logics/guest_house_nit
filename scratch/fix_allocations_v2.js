const db = require('../backend/src/db/db');

async function fix() {
    const client = await db.getClient();
    try {
        const res = await client.query(`
            SELECT b.booking_id, b.checked_out_at, br.allocated_from, br.allocated_to
            FROM booking_requests b
            JOIN booking_rooms br ON br.booking_id = b.booking_id
            WHERE b.booking_state = 'CHECKED_OUT'
        `);
        console.table(res.rows);

        // Just forcefully free all CHECKED_OUT bookings
        const fixRes = await client.query(`
            UPDATE booking_rooms br
            SET allocated_to = CASE 
                WHEN br.allocated_from > b.checked_out_at THEN br.allocated_from 
                ELSE b.checked_out_at 
            END
            FROM booking_requests b
            WHERE br.booking_id = b.booking_id 
              AND b.booking_state = 'CHECKED_OUT'
              AND br.allocated_to > b.checked_out_at
        `);
        console.log(`Forcefully updated ${fixRes.rowCount} checkout allocations.`);
        
        // Let's also check if there are any where checked_out_at is null but state is CHECKED_OUT
        const nullRes = await client.query(`
            UPDATE booking_rooms br
            SET allocated_to = br.allocated_from
            FROM booking_requests b
            WHERE br.booking_id = b.booking_id
              AND b.booking_state = 'CHECKED_OUT'
              AND b.checked_out_at IS NULL
        `);
        console.log(`Updated ${nullRes.rowCount} checkout allocations with null checked_out_at.`);

    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
fix();
