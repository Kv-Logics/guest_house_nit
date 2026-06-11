const db = require('../backend/src/db/db');

async function testRoom() {
    const client = await db.getClient();
    try {
        const res = await client.query(`
            SELECT room_id, room_number, current_status 
            FROM rooms 
            WHERE room_number = '31'
        `);
        console.log("Room 31 status:", res.rows[0]);

        const stays = await client.query(`
            SELECT stay_id, booking_id, guest_id, stay_status
            FROM guest_room_stays
            WHERE room_id = $1 AND stay_status = 'CHECKED_IN'
        `, [res.rows[0].room_id]);
        console.log("Active stays in room 31:", stays.rows);
        
        const allocations = await client.query(`
            SELECT * FROM booking_rooms
            WHERE room_id = $1
        `, [res.rows[0].room_id]);
        console.log("Allocations for room 31:", allocations.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}
testRoom();
