const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/db/db');

async function main() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'guests'
        `);
        console.log("GUESTS COLUMNS:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

main();
