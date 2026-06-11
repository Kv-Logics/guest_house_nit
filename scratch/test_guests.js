const db = require('../backend/src/db/db');

async function checkGuests() {
    const client = await db.getClient();
    try {
        const guests = await client.query(`
            SELECT g.guest_id, g.guest_name, g.booking_id, b.booking_state, b.checked_out_at, g.departure_datetime
            FROM guests g
            JOIN booking_requests b ON g.booking_id = b.booking_id
            WHERE g.guest_name ILIKE '%bhuvenesh%' OR g.guest_name ILIKE '%jaiyandth%' OR g.guest_name ILIKE '%ashwin%'
        `);
        console.log("Guests found:", guests.rows);

        const stays = await client.query(`
            SELECT grs.stay_id, grs.stay_status, g.guest_name, r.room_number, grs.checked_in_at, grs.checked_out_at
            FROM guest_room_stays grs
            JOIN guests g ON grs.guest_id = g.guest_id
            JOIN rooms r ON grs.room_id = r.room_id
            WHERE g.guest_name ILIKE '%bhuvenesh%' OR g.guest_name ILIKE '%jaiyandth%' OR g.guest_name ILIKE '%ashwin%'
        `);
        console.log("Stays for these guests:", stays.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}
checkGuests();
