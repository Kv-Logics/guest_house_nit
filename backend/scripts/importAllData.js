const fs = require('fs');
const path = require('path');
const db = require('../src/db/db');

// Helper to parse CSV safely handling quoted fields
function parseCSV(content) {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const headers = parseCSVLine(lines[0]);
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        if (values.length === 0) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index] !== undefined ? values[index].trim() : '';
        });
        results.push(row);
    }
    return results;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(val => val.replace(/^"|"$/g, '').trim());
}

async function run() {
    try {
        console.log('--- STARTING BULK IMPORT AND SCHEMA RECREATION ---');
        
        // 1. Recreate schema
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        console.log(`Reading schema from ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await db.query(schemaSql);
        console.log('Database schema created successfully. Applying migrations...');

        // Run migrations/alter queries to fit standard code expectations
        await db.query(`
            -- Formatted ID and Financial Year
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS formatted_id VARCHAR(100);
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20);

            -- Drop default from booking_seq
            ALTER TABLE booking_requests ALTER COLUMN booking_seq DROP DEFAULT;
            ALTER TABLE booking_requests ALTER COLUMN booking_seq DROP NOT NULL;

            -- Create sequence_tracker table
            CREATE TABLE IF NOT EXISTS sequence_tracker (
                id SERIAL PRIMARY KEY,
                financial_year VARCHAR(20) UNIQUE NOT NULL,
                last_sequence INTEGER NOT NULL DEFAULT 0
            );

            -- Bulk booking columns
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'NORMAL';
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS bulk_booking_reference VARCHAR(100);
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS bulk_booking_metadata JSONB;

            -- Create bulk booking sequence
            CREATE SEQUENCE IF NOT EXISTS bulk_booking_seq START WITH 1;

            -- expected_departure in guests
            ALTER TABLE guests ADD COLUMN IF NOT EXISTS expected_departure TIMESTAMP;

            -- is_bulk in booking_requests
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;

            -- stay_extension_requests table
            CREATE TABLE IF NOT EXISTS stay_extension_requests (
                extension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
                guest_id UUID NOT NULL REFERENCES guests(guest_id) ON DELETE CASCADE,
                requested_departure TIMESTAMP NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT stay_extension_requests_status_check CHECK (status IN ('PENDING', 'PENDING_AUTHORITY', 'PENDING_ADMIN', 'APPROVED', 'REJECTED'))
            );

            -- Index on stay_extension_requests
            CREATE INDEX IF NOT EXISTS idx_ext_requests_booking_status ON stay_extension_requests(booking_id, status);

            -- config table: institution_configs
            CREATE TABLE IF NOT EXISTS institution_configs (
                config_id SERIAL PRIMARY KEY,
                legal_name VARCHAR(255),
                gstin VARCHAR(50),
                pan VARCHAR(50),
                address TEXT,
                signatory_name VARCHAR(255),
                signatory_designation VARCHAR(255),
                invoice_prefix VARCHAR(50),
                sac_code VARCHAR(50),
                financial_year VARCHAR(20) DEFAULT '25-26',
                booking_prefix VARCHAR(50) DEFAULT 'NITTGH/',
                enable_time_machine BOOLEAN DEFAULT TRUE,
                show_invoice_applicant BOOLEAN DEFAULT TRUE,
                enable_extend_stay_applicant BOOLEAN DEFAULT TRUE,
                always_regenerate_invoices BOOLEAN DEFAULT TRUE,
                gst_rate NUMERIC DEFAULT 12,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Seed config if not exists
            INSERT INTO institution_configs (config_id, legal_name, gstin, pan, address, signatory_name, signatory_designation, invoice_prefix, sac_code, financial_year, booking_prefix, gst_rate)
            VALUES (1, 'NITT Guest House', '33AAAAA0000A1Z', 'PAN000000F', 'NIT Trichy campus', 'Registrar', 'Registrar', 'NITTGH/', 'SAC000', '25-26', 'NITTGH/', 12)
            ON CONFLICT (config_id) DO NOTHING;
        `);
        console.log('Migrations/alter queries applied successfully.');

        // 2. Insert RBAC Roles
        console.log('Inserting standard RBAC roles...');
        await db.query(`
            INSERT INTO roles (role_id, role_name, description) VALUES 
            (2, 'guest_house_admin', 'Guest House Manager'),
            (3, 'reception_staff', 'Front Desk Staff'),
            (4, 'registrar', 'Registrar'),
            (5, 'dean', 'Dean'),
            (6, 'hod', 'Head of Department'),
            (7, 'faculty', 'Faculty Member'),
            (8, 'staff', 'Staff Member'),
            (9, 'student', 'Student'),
            (10, 'director', 'Director'),
            (11, 'gh_coordinator', 'Guest House Coordinator')
            ON CONFLICT (role_id) DO UPDATE SET
                role_name = EXCLUDED.role_name, 
                description = EXCLUDED.description;
        `);

        // 3. Insert default system accounts so reception/admin logins continue to work
        console.log('Seeding default staff and coordinator users...');
        const staffUsers = [
            { full_name: 'GH Chairperson', email: 'ghchairperson@nitt.edu', role: 'guest_house_admin', dept: 'Administration', desig: 'GH Chairperson', emp_id: 'EMP-001' },
            { full_name: 'Receptionist', email: 'ghreception@nitt.edu', role: 'reception_staff', dept: 'Guest House', desig: 'Front Desk', emp_id: 'EMP-006' },
            { full_name: 'GH Coordinator', email: 'guesthouse@nitt.edu', role: 'gh_coordinator', dept: 'Guest House', desig: 'Operations Coordinator', emp_id: 'EMP-007' }
        ];

        for (const u of staffUsers) {
            const userRes = await db.query(`
                INSERT INTO users (full_name, email, department, designation, employee_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO UPDATE SET 
                    full_name = EXCLUDED.full_name,
                    department = EXCLUDED.department, 
                    designation = EXCLUDED.designation
                RETURNING user_id;
            `, [u.full_name, u.email, u.dept, u.desig, u.emp_id]);

            const userId = userRes.rows[0].user_id;
            await db.query(`
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, role_id FROM roles WHERE role_name = $2
                ON CONFLICT (user_id, role_id) DO NOTHING;
            `, [userId, u.role]);
        }

        // 4. Insert Category Rules
        console.log('Inserting category rules...');
        await db.query(`
            INSERT INTO category_rules (category_id, category_code, allowed_applicant_roles, visit_type, max_rooms_allowed, max_guest_count, approval_hierarchy, payment_modes)
            VALUES 
            (1, 'CAT-I', '{faculty,staff,hod,dean,super_admin,guest_house_admin,reception_staff}', 'official', 5, 10, 'director_dean_registrar', '{"institute"}'),
            (2, 'CAT-II', '{faculty,hod,dean,super_admin,guest_house_admin,reception_staff}', 'official', 3, 6, 'dean_hod', '{"project","coordinator","guest"}'),
            (3, 'CAT-III', '{faculty,staff,student,super_admin,guest_house_admin,reception_staff}', 'both', 2, 4, 'faculty_staff', '{"guest","faculty"}')
            ON CONFLICT (category_id) DO UPDATE SET 
                category_code = EXCLUDED.category_code,
                allowed_applicant_roles = EXCLUDED.allowed_applicant_roles,
                visit_type = EXCLUDED.visit_type,
                max_rooms_allowed = EXCLUDED.max_rooms_allowed,
                max_guest_count = EXCLUDED.max_guest_count,
                approval_hierarchy = EXCLUDED.approval_hierarchy,
                payment_modes = EXCLUDED.payment_modes;
        `);

        // 5. Parse and Seed Tariffs from nitt_guest_house_tariff.csv
        const tariffCsvPath = 'C:\\Users\\keert\\GuestHouse\\guesthouse\\Data_Of_Rooms\\nitt_guest_house_tariff.csv';
        console.log(`Parsing Room Tariffs from: ${tariffCsvPath}`);
        if (fs.existsSync(tariffCsvPath)) {
            const tariffContent = fs.readFileSync(tariffCsvPath, 'utf8');
            const tariffRows = parseCSV(tariffContent);
            for (const r of tariffRows) {
                const roomType = r['Room Type'].trim();
                const singleOccupancy = parseFloat(r['Single Occupancy Rent (Rs/day)']);
                const doubleOccupancy = parseFloat(r['Double Occupancy Rent (Rs/day)']);
                const categoriesStr = r['Category'] || '';
                
                // Categories can be e.g. "I, II, III, IV" or "I"
                const cats = categoriesStr.split(',').map(c => c.trim());
                const categoryMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
                
                for (const cat of cats) {
                    const catId = categoryMap[cat];
                    if (catId) {
                        await db.query(`
                            INSERT INTO room_tariffs (category_id, room_type, single_occupancy, double_occupancy, extra_bed)
                            VALUES ($1, $2, $3, $4, 400)
                        `, [catId, roomType, singleOccupancy, doubleOccupancy]);
                    }
                }
            }
            console.log('Room Tariffs seeded successfully.');
        } else {
            console.error(`Tariff CSV not found at ${tariffCsvPath}`);
        }

        // 6. Parse and Seed Rooms from GH-Rooms.csv
        const roomsCsvPath = 'C:\\Users\\keert\\GuestHouse\\guesthouse\\Data_Of_Rooms\\GH-Rooms.csv';
        console.log(`Parsing Rooms from: ${roomsCsvPath}`);
        if (fs.existsSync(roomsCsvPath)) {
            const roomsContent = fs.readFileSync(roomsCsvPath, 'utf8');
            const roomRows = parseCSV(roomsContent);
            for (const r of roomRows) {
                const floorNoRaw = r['Floor No'] || '';
                const roomNoRaw = r['Room No'] || '';
                const roomTypeRaw = r['Room Type'] || '';
                if (!roomNoRaw || !roomTypeRaw) continue;

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

                let room_type = 'Standard Room';
                if (roomTypeRaw === 'Suite') {
                    room_type = 'Suite Room';
                } else if (roomTypeRaw === 'Mini Suite') {
                    room_type = 'Mini Suite Room';
                } else if (roomTypeRaw === 'Standard Room') {
                    room_type = 'Standard Room';
                } else if (roomTypeRaw === 'Renovated Room') {
                    room_type = 'Renovated Room';
                }

                let block_name = 'Main Block';
                const marudhamRooms = ['41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', 'B2'];
                const kurinjiRooms = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', 'F1', 'F2', 'F3', 'A1', 'A2', 'B1'];
                
                if (marudhamRooms.includes(room_number)) {
                    block_name = 'Marudham GH';
                } else if (kurinjiRooms.includes(room_number)) {
                    block_name = 'Kurinji GH';
                }

                await db.query(`
                    INSERT INTO rooms (room_number, block_name, floor_number, room_type, capacity, has_ac, current_status)
                    VALUES ($1, $2, $3, $4, 2, true, 'available')
                    ON CONFLICT (room_number) DO UPDATE SET
                        block_name = EXCLUDED.block_name,
                        room_type = EXCLUDED.room_type,
                        floor_number = EXCLUDED.floor_number;
                `, [room_number, block_name, floor_number, room_type]);
            }
            console.log('Rooms seeded successfully.');
        } else {
            console.error(`Rooms CSV not found at ${roomsCsvPath}`);
        }

        // 7. Parse and Seed Users from Data_Of_Users
        const usersDir = 'C:\\Users\\keert\\GuestHouse\\guesthouse\\Data_Of_Users';
        console.log(`Parsing Users from: ${usersDir}`);

        // Helper to insert user + role
        const insertUserWithRole = async (fullName, email, dept, desig, empId, roleName) => {
            if (!email) return;
            const res = await db.query(`
                INSERT INTO users (full_name, email, department, designation, employee_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    department = EXCLUDED.department,
                    designation = EXCLUDED.designation
                RETURNING user_id;
            `, [fullName, email, dept, desig, empId]);

            const userId = res.rows[0].user_id;
            await db.query(`
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, role_id FROM roles WHERE role_name = $2
                ON CONFLICT (user_id, role_id) DO NOTHING;
            `, [userId, roleName]);
        };

        // 7.1 Director & Registrar
        const dirRegPath = path.join(usersDir, 'Director and Registrar.csv');
        if (fs.existsSync(dirRegPath)) {
            const rows = parseCSV(fs.readFileSync(dirRegPath, 'utf8'));
            for (const r of rows) {
                const name = r['Name'] || '';
                const dept = r['Department'] || '';
                const email = r['Email'] || '';
                if (email.toLowerCase().includes('director')) {
                    await insertUserWithRole(name, email, dept, 'Director', 'EMP-DIR', 'director');
                } else if (email.toLowerCase().includes('registrar')) {
                    await insertUserWithRole(name, email, dept, 'Registrar', 'EMP-REG', 'registrar');
                }
            }
            console.log('Director and Registrar imported.');
        }

        // 7.2 Deans
        const deansPath = path.join(usersDir, 'Deans.csv');
        if (fs.existsSync(deansPath)) {
            // Check headers, the header has a trailing space "Name "
            const rawContent = fs.readFileSync(deansPath, 'utf8');
            const rows = parseCSV(rawContent);
            let idx = 1;
            for (const r of rows) {
                const name = r['Name'] || r['Name '] || '';
                const dept = r['Department'] || '';
                const email = r['Email'] || '';
                await insertUserWithRole(name, email, dept, 'Dean', `EMP-DEAN-${idx++}`, 'dean');
            }
            console.log('Deans imported.');
        }

        // 7.3 HODs
        const hodsPath = path.join(usersDir, 'Hods.csv');
        if (fs.existsSync(hodsPath)) {
            const rows = parseCSV(fs.readFileSync(hodsPath, 'utf8'));
            let idx = 1;
            for (const r of rows) {
                const name = r['Name'] || '';
                const dept = r['Department'] || '';
                const email = r['Email'] || '';
                await insertUserWithRole(name, email, dept, 'HOD', `EMP-HOD-${idx++}`, 'hod');
            }
            console.log('HODs imported.');
        }

        // 7.4 Faculty & Staff (combined in Faculty.csv)
        const facultyPath = path.join(usersDir, 'Faculty.csv');
        if (fs.existsSync(facultyPath)) {
            const rows = parseCSV(fs.readFileSync(facultyPath, 'utf8'));
            for (const r of rows) {
                const userId = r['emp_id'] || r['User ID'] || '';
                const name = r['emp_name'] || r['Name'] || '';
                const email = r['emp_email'] || r['Email'] || '';
                const dept = r['Department'] || 'General';
                // Insert as Faculty
                await insertUserWithRole(name, email, dept, 'Faculty', userId ? `EMP-${userId}` : '', 'faculty');
                // Also assign Staff role so they can apply as staff if needed
                await insertUserWithRole(name, email, dept, 'Staff', userId ? `EMP-${userId}` : '', 'staff');
            }
            console.log('Faculty and Staff imported from Faculty.csv.');
        }

        // 7.5 Students
        const studentsPath = path.join(usersDir, 'Students.csv');
        if (fs.existsSync(studentsPath)) {
            const rows = parseCSV(fs.readFileSync(studentsPath, 'utf8'));
            for (const r of rows) {
                const enrol = r['Enrolment Number'] || '';
                const name = r['NAME'] || '';
                const email = r['Email'] || '';
                const dept = r['OU'] || '';
                await insertUserWithRole(name, email, dept, 'Student', enrol, 'student');
            }
            console.log('Students imported.');
        }

        // 8. Delete sample CSV files from the root of both workspaces
        const rootsToDeleteFrom = [
            'c:\\Users\\keert\\GuestHouse\\guesthouse',
            'c:\\Users\\keert\\NIT Projects\\guesthouse'
        ];
        const filesToClear = [
            'GH-Rooms.csv',
            'nitt_guest_house_tariff.csv',
            'refernceOfBill.csv',
            'sample.csv'
        ];

        console.log('Cleaning up old CSV files from root directories...');
        for (const root of rootsToDeleteFrom) {
            for (const file of filesToClear) {
                const fullPath = path.join(root, file);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted: ${fullPath}`);
                }
            }
        }

        console.log('--- BULK IMPORT COMPLETED SUCCESSFULLY ---');
    } catch (err) {
        console.error('CRITICAL ERROR IN IMPORT PROCESS:', err);
    } finally {
        process.exit();
    }
}

run();
