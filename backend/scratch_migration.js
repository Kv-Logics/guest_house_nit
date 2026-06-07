const { getClient } = require('./src/config/database');

async function run() {
    const client = await getClient();
    try {
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS financial_year VARCHAR(10) DEFAULT '25-26'`);
        console.log('Successfully added financial_year to institution_configs');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
