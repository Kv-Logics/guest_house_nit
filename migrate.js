require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/db/db');

async function run() {
    try {
        await db.query("ALTER TABLE final_bills ADD COLUMN billing_type VARCHAR(20) DEFAULT 'B2C' CHECK (billing_type IN ('B2C', 'B2B'))");
        await db.query("ALTER TABLE final_bills ADD COLUMN company_name VARCHAR(255)");
        await db.query("ALTER TABLE final_bills ADD COLUMN gstin VARCHAR(50)");
        await db.query("ALTER TABLE final_bills ADD COLUMN company_address TEXT");
        console.log("Migration successful");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
