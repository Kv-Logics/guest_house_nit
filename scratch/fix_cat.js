const db = require('../backend/src/db/db');

async function fixCat1() {
    const client = await db.getClient();
    try {
        const res = await client.query("SELECT allowed_applicant_roles FROM category_rules WHERE category_id = 1");
        let roles = res.rows[0].allowed_applicant_roles;
        if (!roles.includes('director')) {
            roles.push('director');
            await client.query("UPDATE category_rules SET allowed_applicant_roles = $1 WHERE category_id = 1", [roles]);
            console.log("Director added to CAT-I");
        } else {
            console.log("Director already in CAT-I");
        }
    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
fixCat1();
