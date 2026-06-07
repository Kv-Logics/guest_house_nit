const db = require('./src/db/db');

async function fix() {
    try {
        // For bookings where admin already approved the extension (booking_state back to CHECKED_IN,
        // pending_extension_datetime cleared), mark those extension requests as already allocated
        const res = await db.query(`
            UPDATE stay_extension_requests 
            SET is_allocated = true, updated_at = CURRENT_TIMESTAMP
            WHERE status = 'APPROVED' AND is_allocated = false
            AND booking_id IN (
                SELECT booking_id FROM booking_requests 
                WHERE booking_state IN ('CHECKED_IN', 'CHECKED_OUT') 
                AND pending_extension_datetime IS NULL
            )
            RETURNING extension_id, booking_id
        `);
        console.log('Marked', res.rowCount, 'extensions as already allocated:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fix();
