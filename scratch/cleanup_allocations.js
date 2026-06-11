const db = require('../backend/src/db/db');

async function cleanAllocations() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Delete all booking_rooms allocations where the booking is already CHECKED_OUT or CANCELLED.
        // This frees the rooms up immediately and ignores any historical tsrange overlap.
        const res = await client.query(`
            DELETE FROM booking_rooms
            WHERE booking_id IN (
                SELECT booking_id FROM booking_requests WHERE booking_state IN ('CHECKED_OUT', 'CANCELLED', 'REJECTED', 'ADMIN_REJECTED', 'DIRECTOR_REJECTED', 'APPROVER_REJECTED')
            )
            RETURNING *;
        `);
        console.log(`Successfully deleted ${res.rowCount} stale booking_rooms allocations.`);

        await client.query('COMMIT');
        console.log("Cleanup completed successfully.");
    } catch(e) {
        await client.query('ROLLBACK');
        console.error("Error during cleanup:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}
cleanAllocations();
