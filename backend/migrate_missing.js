const db = require('./src/db/db');

async function migrate() {
    try {
        console.log('Starting migration to add missing payment columns to final_bills...');
        
        await db.query(`
            ALTER TABLE final_bills
            ADD COLUMN IF NOT EXISTS amount_received NUMERIC,
            ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(user_id),
            ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)
        `);
        
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, 'schema.sql');
        let schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        if (!schemaContent.includes('amount_received NUMERIC')) {
            schemaContent = schemaContent.replace(
                "payment_proof_path VARCHAR(512),",
                "payment_proof_path VARCHAR(512),\n    amount_received NUMERIC,\n    received_by UUID REFERENCES users(user_id),\n    invoice_number VARCHAR(100),"
            );
            fs.writeFileSync(schemaPath, schemaContent, 'utf8');
            console.log('Updated schema.sql with missing columns.');
        }

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
