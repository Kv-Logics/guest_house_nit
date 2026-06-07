const db = require('../src/db/db');

async function run() {
    console.log('Adding booking_seq to booking_requests...');
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query(`
            ALTER TABLE booking_requests 
            ADD COLUMN IF NOT EXISTS booking_seq SERIAL;
        `);
        await client.query('COMMIT');
        console.log('Column booking_seq added successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
