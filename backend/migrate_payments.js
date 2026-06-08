const db = require('./src/db/db');

async function migrate() {
    try {
        console.log('Starting migration to add payment columns to final_bills...');
        
        await db.query(`
            ALTER TABLE final_bills
            ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(100),
            ADD COLUMN IF NOT EXISTS payment_comments TEXT,
            ADD COLUMN IF NOT EXISTS payment_proof_path VARCHAR(512)
        `);
        
        // Also update schema.sql for future initializations
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, 'schema.sql');
        let schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        if (!schemaContent.includes('transaction_ref VARCHAR(100)')) {
            schemaContent = schemaContent.replace(
                "payment_mode VARCHAR(50),",
                "payment_mode VARCHAR(50),\n    transaction_ref VARCHAR(100),\n    payment_comments TEXT,\n    payment_proof_path VARCHAR(512),"
            );
            fs.writeFileSync(schemaPath, schemaContent, 'utf8');
            console.log('Updated schema.sql with new columns.');
        }

        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
