const db = require('../backend/src/db/db');

async function testCheckIn() {
    const client = await db.getClient();
    try {
        console.log("Checking for overlapping rooms in booking_rooms...");
        const overlaps = await client.query(`
            SELECT a.booking_id as b1, a.room_id, a.allocated_from as start1, a.allocated_to as end1,
                   b.booking_id as b2, b.allocated_from as start2, b.allocated_to as end2
            FROM booking_rooms a
            JOIN booking_rooms b ON a.room_id = b.room_id AND a.booking_id != b.booking_id
            WHERE a.allocated_from < b.allocated_to AND a.allocated_to > b.allocated_from
        `);
        console.log("Overlaps found:", overlaps.rows);

        const activeRooms = await client.query(`
            SELECT br.booking_id, br.room_id, br.allocated_from, br.allocated_to, b.booking_state
            FROM booking_rooms br
            JOIN booking_requests b ON br.booking_id = b.booking_id
            WHERE br.allocated_to > CURRENT_TIMESTAMP
            ORDER BY br.room_id, br.allocated_from
        `);
        console.log("Active room allocations:", activeRooms.rows.length);
        
        // Let's also check if there's any recent errors in a custom log, but there's no custom log file.
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}
testCheckIn();
