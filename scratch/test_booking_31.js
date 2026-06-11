const db = require('../backend/src/db/db');

async function testBooking() {
    const client = await db.getClient();
    try {
        const bookingId = 'f95661b2-13da-4d4f-ad35-643696e32929';
        const b = await client.query('SELECT booking_state, checked_out_at FROM booking_requests WHERE booking_id = $1', [bookingId]);
        console.log("Booking State:", b.rows[0]);

        const g = await client.query('SELECT guest_id, guest_name FROM guests WHERE booking_id = $1', [bookingId]);
        console.log("Guests:", g.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}
testBooking();
