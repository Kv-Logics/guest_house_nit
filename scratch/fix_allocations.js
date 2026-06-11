const db = require('../backend/src/db/db');

async function fixAllocations() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Delete booking_rooms for cancelled bookings
        const cancelRes = await client.query(`
            DELETE FROM booking_rooms
            WHERE booking_id IN (
                SELECT booking_id FROM booking_requests WHERE booking_state = 'CANCELLED'
            )
            RETURNING *;
        `);
        console.log(`Deleted ${cancelRes.rowCount} allocations for cancelled bookings.`);

        // 2. Fix booking_rooms for checked out bookings
        const checkedOutRes = await client.query(`
            SELECT b.booking_id, b.checked_out_at, br.room_id, br.allocated_from, br.allocated_to
            FROM booking_rooms br
            JOIN booking_requests b ON br.booking_id = b.booking_id
            WHERE b.booking_state = 'CHECKED_OUT' AND br.allocated_to > b.checked_out_at;
        `);

        for (const row of checkedOutRes.rows) {
            await client.query(`
                UPDATE booking_rooms
                SET allocated_to = CASE WHEN allocated_from > $1 THEN allocated_from ELSE $1 END
                WHERE booking_id = $2 AND room_id = $3
            `, [row.checked_out_at, row.booking_id, row.room_id]);
        }
        console.log(`Updated ${checkedOutRes.rowCount} allocations for checked out bookings.`);

        // 3. Fix booking_rooms for individually checked out stays where booking is still CHECKED_IN
        const stayCheckedOutRes = await client.query(`
            SELECT grs.booking_id, grs.room_id, MAX(grs.checked_out_at) as last_checkout
            FROM guest_room_stays grs
            WHERE grs.stay_status = 'CHECKED_OUT'
            GROUP BY grs.booking_id, grs.room_id
        `);

        let fixedStays = 0;
        for (const row of stayCheckedOutRes.rows) {
            // Ensure no other guest is currently checked in to the same room for the same booking
            const activeRes = await client.query(`
                SELECT 1 FROM guest_room_stays
                WHERE booking_id = $1 AND room_id = $2 AND stay_status = 'CHECKED_IN'
            `, [row.booking_id, row.room_id]);

            if (activeRes.rows.length === 0) {
                const brRes = await client.query(`
                    SELECT allocated_from, allocated_to FROM booking_rooms
                    WHERE booking_id = $1 AND room_id = $2
                `, [row.booking_id, row.room_id]);

                if (brRes.rows.length > 0) {
                    const br = brRes.rows[0];
                    if (br.allocated_to > row.last_checkout) {
                        await client.query(`
                            UPDATE booking_rooms
                            SET allocated_to = CASE WHEN allocated_from > $1 THEN allocated_from ELSE $1 END
                            WHERE booking_id = $2 AND room_id = $3
                        `, [row.last_checkout, row.booking_id, row.room_id]);
                        fixedStays++;
                    }
                }
            }
        }
        console.log(`Updated ${fixedStays} allocations for individually checked out guests.`);

        await client.query('COMMIT');
        console.log("Fix completed successfully.");
    } catch(e) {
        await client.query('ROLLBACK');
        console.error("Error:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}
fixAllocations();
