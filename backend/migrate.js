const db = require('./src/db/db');

async function runMigration() {
    console.log('Starting migration...');
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // 1. Institution configs
        await client.query(`
            CREATE TABLE IF NOT EXISTS institution_configs (
                config_id SERIAL PRIMARY KEY,
                legal_name VARCHAR(255) DEFAULT 'NIT Trichy Guest House',
                gstin VARCHAR(50) DEFAULT '33AAAAA0000A1Z5',
                pan VARCHAR(50) DEFAULT 'AAAAA0000A',
                address TEXT DEFAULT 'Tanjore Main Road, NH 67, Tiruchirappalli, Tamil Nadu - 620015',
                signatory_name VARCHAR(150) DEFAULT 'Authorized Officer',
                signatory_designation VARCHAR(100) DEFAULT 'GH Coordinator',
                invoice_prefix VARCHAR(50) DEFAULT 'NITTGH/25-26/',
                sac_code VARCHAR(20) DEFAULT '996311',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await client.query(`
            INSERT INTO institution_configs (config_id) VALUES (1) ON CONFLICT DO NOTHING;
        `);
        
        // 2. Final bills extra columns
        await client.query(`ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);`);
        await client.query(`ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS amount_received NUMERIC;`);
        await client.query(`ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(100);`);
        await client.query(`ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(user_id);`);
        await client.query(`ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) UNIQUE;`);
        
        // 3. Booking requests bulk flag
        await client.query(`ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;`);
        
        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigration();
