const db = require('./src/db/db');
require('dotenv').config();

async function run() {
    try {
        const roomRes = await db.query("SELECT * FROM rooms WHERE room_number = '15'");
        console.log("=== ROOM 15 ===");
        console.log(roomRes.rows);

        const staysRes = await db.query(`
            SELECT grs.*, g.guest_name, g.relation_to_applicant, b.booking_state
            FROM guest_room_stays grs
            JOIN guests g ON grs.guest_id = g.guest_id
            JOIN booking_requests b ON grs.booking_id = b.booking_id
            WHERE grs.room_id = $1
        `, [roomRes.rows[0].room_id]);
        console.log("=== STAYS FOR ROOM 15 ===");
        console.log(staysRes.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
