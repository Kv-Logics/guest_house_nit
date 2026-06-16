require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/db/db');

async function run() {
    try {
        console.log("Starting DB migration for warnings and maintenance...");
        // 1. Drop check constraint on payment_warnings warning_level
        await db.query("ALTER TABLE payment_warnings DROP CONSTRAINT IF EXISTS payment_warnings_warning_level_check");
        // 2. Add check constraint >= 1
        await db.query("ALTER TABLE payment_warnings ADD CONSTRAINT payment_warnings_warning_level_check CHECK (warning_level >= 1)");
        // 3. Drop check constraint on booking_requests payment_state
        await db.query("ALTER TABLE booking_requests DROP CONSTRAINT IF EXISTS booking_requests_payment_state_check");
        console.log("DB Migration successful!");
    } catch (e) {
        console.error("DB Migration failed:", e);
    } finally {
        process.exit(0);
    }
}
run();
