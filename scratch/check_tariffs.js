const db = require('../backend/src/db/db');

async function check() {
    const client = await db.getClient();
    try {
        const res = await client.query("SELECT * FROM room_tariffs");
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
check();
