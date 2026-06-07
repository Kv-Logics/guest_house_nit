const pool = require('./src/db/db');

async function fix() {
    try {
        console.log('Connecting and fixing room 11...');
        const res = await pool.query(`
            DELETE FROM booking_rooms 
            WHERE room_id = (SELECT room_id FROM rooms WHERE room_number = '11') 
              AND booking_id IN (SELECT booking_id FROM booking_requests WHERE booking_state IN ('CHECKED_OUT', 'CANCELLED', 'REJECTED'))
        `);
        console.log('Deleted overlap rows:', res.rowCount);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
fix();
