const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        console.log('Running schema migrations...');
        const schemaPath = path.join(__dirname, '../../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await db.query(schemaSql);
        console.log('Schema migration completed successfully!');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        process.exit();
    }
}

runMigration();
