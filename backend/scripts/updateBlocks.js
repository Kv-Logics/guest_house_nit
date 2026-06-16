const db = require('../src/db/db');

async function run() {
    try {
        console.log('--- UPDATING ROOM BLOCKS ---');

        const marudhamRooms = ['41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', 'B2'];
        const kurinjiRooms = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', 'F1', 'F2', 'F3', 'A1', 'A2', 'B1'];

        for (const room of marudhamRooms) {
            await db.query(`UPDATE rooms SET block_name = 'Marudham GH' WHERE room_number = $1`, [room]);
        }
        console.log(`Updated ${marudhamRooms.length} rooms to Marudham GH`);

        for (const room of kurinjiRooms) {
            await db.query(`UPDATE rooms SET block_name = 'Kurinji GH' WHERE room_number = $1`, [room]);
        }
        console.log(`Updated ${kurinjiRooms.length} rooms to Kurinji GH`);

        console.log('--- DONE ---');
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

run();
