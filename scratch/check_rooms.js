const db = require('../backend/src/db/db');

async function check() {
    const client = await db.getClient();
    try {
        const allocs = await client.query(`
            SELECT br.*, b.booking_state 
            FROM booking_rooms br
            JOIN booking_requests b ON br.booking_id = b.booking_id
            JOIN rooms r ON br.room_id = r.room_id
            WHERE r.room_number = '31'
        `);
        console.log("Allocations for room 31:");
        console.table(allocs.rows);
    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
check();
