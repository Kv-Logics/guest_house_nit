require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/db/db');

async function run() {
    try {
        console.log("Starting DB migration to add pos_reference to booking_requests...");
        await db.query(`
            ALTER TABLE booking_requests 
            ADD COLUMN IF NOT EXISTS pos_reference VARCHAR(255)
        `);
        console.log("pos_reference column added successfully!");
    } catch (e) {
        console.error("DB Migration failed:", e);
    } finally {
        process.exit(0);
    }
}
run();
