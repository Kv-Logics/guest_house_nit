const db = require('./src/db/db');

async function runMigration() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Add always_regenerate_invoices column
        await client.query(`ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS always_regenerate_invoices BOOLEAN DEFAULT true`);
        
        await client.query('COMMIT');
        console.log('Successfully added always_regenerate_invoices to institution_configs');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigration();
