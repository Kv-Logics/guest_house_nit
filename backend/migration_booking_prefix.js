const db = require('./src/db/db');

async function migrate() {
    const client = await db.getClient();
    try {
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS booking_prefix VARCHAR(50) DEFAULT 'NITTGH/'`);
        console.log('Successfully added booking_prefix');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
migrate();
