const db = require('./src/db/db');

async function run() {
    const client = await db.getClient();
    try {
        await client.query('ALTER TABLE stay_extension_requests ADD COLUMN IF NOT EXISTS is_allocated BOOLEAN DEFAULT false');
        console.log('Success');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
run();
