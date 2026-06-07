const db = require('./src/db/db');

async function migrate() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Add expected_departure to guests
        await client.query(`
            ALTER TABLE guests 
            ADD COLUMN IF NOT EXISTS expected_departure TIMESTAMP;
        `);

        // Create stay_extension_requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS stay_extension_requests (
                extension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
                guest_id UUID NOT NULL REFERENCES guests(guest_id) ON DELETE CASCADE,
                requested_departure TIMESTAMP NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log('Successfully created extension requests table and updated guests table.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
migrate();
