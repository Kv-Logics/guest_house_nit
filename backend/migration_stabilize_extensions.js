const db = require('./src/db/db');

async function migrate() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Update status CHECK constraint to support new values
        await client.query(`
            ALTER TABLE stay_extension_requests 
            DROP CONSTRAINT IF EXISTS stay_extension_requests_status_check
        `);
        await client.query(`
            ALTER TABLE stay_extension_requests 
            ADD CONSTRAINT stay_extension_requests_status_check 
            CHECK (status IN ('PENDING', 'PENDING_AUTHORITY', 'PENDING_ADMIN', 'APPROVED', 'REJECTED'))
        `);

        // Migrate any old PENDING records: if booking is CHECKED_IN and has PENDING extensions,
        // they should be PENDING_AUTHORITY (waiting for authority approval)
        await client.query(`
            UPDATE stay_extension_requests SET status = 'PENDING_AUTHORITY'
            WHERE status = 'PENDING'
        `);

        // Add index for efficient lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_ext_requests_booking_status 
            ON stay_extension_requests(booking_id, status)
        `);

        await client.query('COMMIT');
        console.log('Extension stabilization migration complete.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
migrate();
