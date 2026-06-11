const db = require('../backend/src/db/db');

async function check() {
    const client = await db.getClient();
    try {
        const res = await client.query("SELECT * FROM category_rules WHERE category_id = 1");
        console.log(res.rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
check();
