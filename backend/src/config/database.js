const db = require('../db/db');

async function getClient() {
    return db.getClient();
}

async function runQuery(client, sql, params) {
    if (client) {
        return client.query(sql, params);
    }
    return db.query(sql, params);
}

module.exports = {
    getClient,
    runQuery,
    query: db.query,
    pool: db.pool
};
