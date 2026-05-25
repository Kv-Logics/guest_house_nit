const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'guest_house',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function resetDB() {
    const client = await pool.connect();
    try {
        console.log("Truncating booking_requests CASCADE...");
        await client.query(`TRUNCATE TABLE booking_requests CASCADE;`);
        
        // Also ensure rooms are marked available
        console.log("Resetting all rooms to AVAILABLE...");
        await client.query(`UPDATE rooms SET current_status = 'available';`);
        
        console.log("Database reset complete.");
    } catch (e) {
        console.error("Error resetting database:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDB();
