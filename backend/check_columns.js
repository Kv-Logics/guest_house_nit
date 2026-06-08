const db = require('./src/db/db');

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'final_bills'
    `);
    console.log('Columns in final_bills:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
  } catch (err) {
    console.error('Failed to query columns:', err);
  }
}

check();
