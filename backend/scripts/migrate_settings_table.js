require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/db/db');

async function run() {
    try {
        console.log("Starting DB migration for settings table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(255) PRIMARY KEY,
                setting_value TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("system_settings table created successfully!");
    } catch (e) {
        console.error("DB Migration failed:", e);
    } finally {
        process.exit(0);
    }
}
run();
