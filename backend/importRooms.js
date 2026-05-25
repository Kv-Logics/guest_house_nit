const fs = require('fs');
const path = require('path');
const db = require('./src/db/db');

async function importRooms() {
    try {
        console.log('Starting Room Import from CSV...');

        const csvPath = path.join(__dirname, '..', 'GH-Rooms.csv');
        if (!fs.existsSync(csvPath)) {
            throw new Error(`GH-Rooms.csv not found at path: ${csvPath}`);
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const csvLines = csvContent.split(/\r?\n/);
        console.log(`Read CSV file. Total lines found: ${csvLines.length}`);

        let importedCount = 0;

        for (let i = 1; i < csvLines.length; i++) {
            const csvLine = csvLines[i].trim();
            if (!csvLine) continue;

            const [floorNoRaw, roomNoRaw, roomTypeRaw] = csvLine.split(',');
            if (!roomNoRaw || !roomTypeRaw) {
                console.warn(`Skipping invalid CSV line ${i + 1}: "${csvLine}"`);
                continue;
            }

            const room_number = roomNoRaw.trim();
            const rawFloor = floorNoRaw.trim().toUpperCase();
            let floor_number = 0;
            if (rawFloor.includes('GROUND') || rawFloor.includes('0')) {
                floor_number = 0;
            } else if (rawFloor.includes('FIRST') || rawFloor.includes('1')) {
                floor_number = 1;
            } else if (rawFloor.includes('SECOND') || rawFloor.includes('2')) {
                floor_number = 2;
            } else if (rawFloor.includes('THIRD') || rawFloor.includes('3')) {
                floor_number = 3;
            }

            const rawType = roomTypeRaw.trim();
            let room_type = 'Standard Room';
            if (rawType === 'Suite') {
                room_type = 'Suite Room';
            } else if (rawType === 'Mini Suite') {
                room_type = 'Mini Suite Room';
            } else if (rawType === 'Standard Room') {
                room_type = 'Standard Room';
            } else if (rawType === 'Renovated Room') {
                room_type = 'Renovated Room';
            }

            const block_name = 'Main Block';
            const capacity = 2;
            const has_ac = true;
            
            // Default status is 'occupied' for the active seeded stayed rooms (A1, 11, 12), otherwise 'available'
            let current_status = 'available';
            if (['A1', '11', '12'].includes(room_number)) {
                current_status = 'occupied';
            }

            // Perform SQL Upsert to preserve existing room statuses (occupied, cleaning, etc.)
            await db.query(
                `INSERT INTO rooms (room_number, block_name, floor_number, room_type, capacity, has_ac, current_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (room_number) DO UPDATE SET
                    block_name = EXCLUDED.block_name,
                    floor_number = EXCLUDED.floor_number,
                    room_type = EXCLUDED.room_type,
                    capacity = EXCLUDED.capacity,
                    has_ac = EXCLUDED.has_ac;`,
                [room_number, block_name, floor_number, room_type, capacity, has_ac, current_status]
            );

            importedCount++;
        }

        console.log(`Successfully processed/upserted ${importedCount} rooms into database.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during room import:', error);
        process.exit(1);
    }
}

importRooms();
