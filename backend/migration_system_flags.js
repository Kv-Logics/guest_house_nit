const db = require('./src/db/db');

async function migrate() {
    const client = await db.getClient();
    try {
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS enable_time_machine BOOLEAN DEFAULT TRUE`);
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS show_invoice_applicant BOOLEAN DEFAULT TRUE`);
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS enable_extend_stay_applicant BOOLEAN DEFAULT TRUE`);
        console.log('Successfully added system flags to institution_configs');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
migrate();
