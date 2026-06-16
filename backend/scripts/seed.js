/**
 * seed.js — NITT Guest House Database Seeder
 *
 * Seeds: roles, staff accounts, category rules, institution config,
 *        rooms, room tariffs, authority users (Director/Registrar/Deans/HODs),
 *        faculty, and students — all from CSV files bundled in the project.
 *
 * Usage (local):
 *   node seed.js
 *
 * Usage (Docker — run after containers are up):
 *   docker compose exec backend node seed.js
 *
 * Safe to re-run: all inserts use ON CONFLICT DO NOTHING / DO UPDATE.
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../src/db/db');

// ─── Path resolution ─────────────────────────────────────────────────────────
// Works both locally and inside Docker (WORKDIR /app, project root one level up
// because Data_Of_Users and Data_Of_Rooms are copied into the container via COPY . .)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_USERS   = path.join(PROJECT_ROOT, '..', 'Data_Of_Users');   // project-root/Data_Of_Users
const DATA_ROOMS   = path.join(PROJECT_ROOT, '..', 'Data_Of_Rooms');   // project-root/Data_Of_Rooms

// Fallback: if Docker layout puts them inside /app directly
const DATA_USERS_ALT = path.join(PROJECT_ROOT, 'Data_Of_Users');
const DATA_ROOMS_ALT = path.join(PROJECT_ROOT, 'Data_Of_Rooms');

function resolveDir(primary, fallback) {
    if (fs.existsSync(primary)) return primary;
    if (fs.existsSync(fallback)) return fallback;
    return null;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function parseCSV(content) {
    const lines = content.split(/\r?\n/);
    if (!lines.length) return [];
    const headers = parseCSVLine(lines[0]);
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
        results.push(row);
    }
    return results;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"')       { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else                    { current += char; }
    }
    result.push(current);
    return result.map(v => v.replace(/^"|"$/g, '').trim());
}

function escape(str) {
    if (!str) return null;
    return str.replace(/'/g, "''");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n══════════════════════════════════════════');
    console.log(' NITT Guest House — Database Seeder');
    console.log('══════════════════════════════════════════\n');

    const usersDir = resolveDir(DATA_USERS, DATA_USERS_ALT);
    const roomsDir = resolveDir(DATA_ROOMS, DATA_ROOMS_ALT);

    if (!usersDir) console.warn('⚠  Data_Of_Users not found — user CSVs will be skipped.');
    if (!roomsDir) console.warn('⚠  Data_Of_Rooms not found — room/tariff CSVs will be skipped.');

    // ── 1. RBAC Roles ─────────────────────────────────────────────────────────
    console.log('▶ Seeding RBAC roles...');
    await db.query(`
        INSERT INTO roles (role_id, role_name, description) VALUES
            (1,  'super_admin',       'System Administrator'),
            (2,  'guest_house_admin', 'Guest House Manager'),
            (3,  'reception_staff',   'Front Desk Staff'),
            (4,  'registrar',         'Registrar'),
            (5,  'dean',              'Dean'),
            (6,  'hod',               'Head of Department'),
            (7,  'faculty',           'Faculty Member'),
            (8,  'staff',             'Staff Member'),
            (9,  'student',           'Student'),
            (10, 'director',          'Director'),
            (11, 'gh_coordinator',    'Guest House Coordinator')
        ON CONFLICT (role_id) DO UPDATE SET
            role_name   = EXCLUDED.role_name,
            description = EXCLUDED.description;
    `);
    console.log('  ✔ Roles done.');

    // ── 2. Default Staff Accounts ──────────────────────────────────────────────
    console.log('▶ Seeding default staff accounts...');
    const staffUsers = [
        { full_name: 'GH Chairperson',  email: 'ghchairperson@nitt.edu', role: 'super_admin',    dept: 'Administration', desig: 'GH Chairperson',         emp_id: 'EMP-001' },
        { full_name: 'Receptionist',     email: 'ghreception@nitt.edu',   role: 'reception_staff', dept: 'Guest House',    desig: 'Front Desk',              emp_id: 'EMP-006' },
        { full_name: 'GH Coordinator',   email: 'guesthouse@nitt.edu',    role: 'gh_coordinator',  dept: 'Guest House',    desig: 'Operations Coordinator',  emp_id: 'EMP-007' },
    ];
    for (const u of staffUsers) {
        const res = await db.query(`
            INSERT INTO users (full_name, email, department, designation, employee_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                full_name   = EXCLUDED.full_name,
                department  = EXCLUDED.department,
                designation = EXCLUDED.designation
            RETURNING user_id;
        `, [u.full_name, u.email, u.dept, u.desig, u.emp_id]);
        const uid = res.rows[0].user_id;
        await db.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, role_id FROM roles WHERE role_name = $2
            ON CONFLICT (user_id, role_id) DO NOTHING;
        `, [uid, u.role]);
    }
    console.log('  ✔ Staff accounts done.');

    // ── 3. Category Rules ──────────────────────────────────────────────────────
    console.log('▶ Seeding category rules...');
    await db.query(`
        INSERT INTO category_rules
            (category_id, category_code, allowed_applicant_roles, visit_type,
             max_rooms_allowed, max_guest_count, approval_hierarchy, payment_modes)
        VALUES
            (1, 'CAT-I',
             '{faculty,staff,hod,dean,super_admin,guest_house_admin,reception_staff}',
             'official', 5, 10, 'director_dean_registrar', '{"institute"}'),
            (2, 'CAT-II',
             '{faculty,hod,dean,super_admin,guest_house_admin,reception_staff}',
             'official', 3, 6, 'dean_hod', '{"project","coordinator","guest"}'),
            (3, 'CAT-III',
             '{faculty,staff,student,super_admin,guest_house_admin,reception_staff}',
             'both', 2, 4, 'faculty_staff', '{"guest","faculty"}')
        ON CONFLICT (category_id) DO UPDATE SET
            category_code           = EXCLUDED.category_code,
            allowed_applicant_roles = EXCLUDED.allowed_applicant_roles,
            visit_type              = EXCLUDED.visit_type,
            max_rooms_allowed       = EXCLUDED.max_rooms_allowed,
            max_guest_count         = EXCLUDED.max_guest_count,
            approval_hierarchy      = EXCLUDED.approval_hierarchy,
            payment_modes           = EXCLUDED.payment_modes;
    `);
    console.log('  ✔ Category rules done.');

    // ── 4. Institution Config ──────────────────────────────────────────────────
    console.log('▶ Seeding institution config...');
    await db.query(`
        INSERT INTO institution_configs
            (config_id, legal_name, gstin, pan, address,
             signatory_name, signatory_designation, invoice_prefix,
             sac_code, financial_year, booking_prefix, gst_rate)
        VALUES
            (1, 'NITT Guest House', '33AAAAA0000A1Z', 'PAN000000F',
             'NIT Trichy Campus, Tiruchirappalli, Tamil Nadu - 620015',
             'Registrar', 'Registrar', 'NITTGH/', 'SAC000', '25-26', 'NITTGH/', 12)
        ON CONFLICT (config_id) DO NOTHING;
    `);
    console.log('  ✔ Institution config done.');

    // ── 5. Rooms ───────────────────────────────────────────────────────────────
    if (roomsDir) {
        const roomsCsvPath = path.join(roomsDir, 'GH-Rooms.csv');
        if (fs.existsSync(roomsCsvPath)) {
            console.log('▶ Seeding rooms from GH-Rooms.csv...');
            const rows = parseCSV(fs.readFileSync(roomsCsvPath, 'utf8'));

            const marudhamRooms = new Set(['41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','B2']);
            const kurinjiRooms  = new Set(['11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','F1','F2','F3','A1','A2','B1']);

            const floorMap = { 'GROUND': 0, '0': 0, 'FIRST': 1, '1': 1, 'SECOND': 2, '2': 2, 'THIRD': 3, '3': 3 };
            const typeMap  = { 'Suite': 'Suite Room', 'Mini Suite': 'Mini Suite Room', 'Standard Room': 'Standard Room', 'Renovated Room': 'Renovated Room' };

            let inserted = 0;
            for (const r of rows) {
                const room_number = (r['Room No'] || '').trim();
                const rawFloor    = (r['Floor No'] || '').trim().toUpperCase();
                const rawType     = (r['Room Type'] || '').trim();
                if (!room_number || !rawType) continue;

                const floorKey    = Object.keys(floorMap).find(k => rawFloor.includes(k));
                const floor_number = floorMap[floorKey] ?? 0;
                const room_type    = typeMap[rawType] || 'Standard Room';
                const block_name   = marudhamRooms.has(room_number) ? 'Marudham GH'
                                   : kurinjiRooms.has(room_number)  ? 'Kurinji GH'
                                   : 'Main Block';

                await db.query(`
                    INSERT INTO rooms (room_number, block_name, floor_number, room_type, capacity, has_ac, current_status)
                    VALUES ($1, $2, $3, $4, 2, true, 'available')
                    ON CONFLICT (room_number) DO UPDATE SET
                        block_name   = EXCLUDED.block_name,
                        room_type    = EXCLUDED.room_type,
                        floor_number = EXCLUDED.floor_number;
                `, [room_number, block_name, floor_number, room_type]);
                inserted++;
            }
            console.log(`  ✔ ${inserted} rooms seeded.`);
        } else {
            console.warn('  ⚠  GH-Rooms.csv not found, skipping rooms.');
        }

        // ── 6. Room Tariffs ────────────────────────────────────────────────────
        const tariffCsvPath = path.join(roomsDir, 'nitt_guest_house_tariff.csv');
        if (fs.existsSync(tariffCsvPath)) {
            console.log('▶ Seeding room tariffs...');
            const rows     = parseCSV(fs.readFileSync(tariffCsvPath, 'utf8'));
            const catMap   = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
            let inserted   = 0;
            for (const r of rows) {
                const room_type = (r['Room Type'] || '').trim();
                const single    = parseFloat(r['Single Occupancy Rent (Rs/day)']) || 0;
                const dbl       = parseFloat(r['Double Occupancy Rent (Rs/day)']) || 0;
                const cats      = (r['Category'] || '').split(',').map(c => c.trim());
                for (const cat of cats) {
                    const catId = catMap[cat];
                    if (!catId) continue;
                    await db.query(`
                        INSERT INTO room_tariffs (category_id, room_type, single_occupancy, double_occupancy, extra_bed)
                        VALUES ($1, $2, $3, $4, 400)
                        ON CONFLICT DO NOTHING;
                    `, [catId, room_type, single, dbl]);
                    inserted++;
                }
            }
            console.log(`  ✔ ${inserted} tariff entries seeded.`);
        } else {
            console.warn('  ⚠  nitt_guest_house_tariff.csv not found, skipping tariffs.');
        }
    }

    // ── Helper: insert user + assign role ────────────────────────────────────
    const insertUser = async (fullName, email, dept, desig, empId, roleName) => {
        if (!email || !fullName) return;
        // Skip clearly garbage entries (image filenames misused as faculty names)
        if (email.includes('.jpg') || email.includes('.jpeg') || email.includes('.png') || email.includes('.pdf')) return;
        const res = await db.query(`
            INSERT INTO users (full_name, email, department, designation, employee_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                full_name   = EXCLUDED.full_name,
                department  = EXCLUDED.department,
                designation = EXCLUDED.designation
            RETURNING user_id;
        `, [fullName, email, dept, desig, empId]);
        const uid = res.rows[0].user_id;
        await db.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, role_id FROM roles WHERE role_name = $2
            ON CONFLICT (user_id, role_id) DO NOTHING;
        `, [uid, roleName]);
    };

    if (usersDir) {
        // ── 7. Director & Registrar ────────────────────────────────────────────
        const dirRegPath = path.join(usersDir, 'Director and Registrar.csv');
        if (fs.existsSync(dirRegPath)) {
            console.log('▶ Seeding Director & Registrar...');
            const rows = parseCSV(fs.readFileSync(dirRegPath, 'utf8'));
            for (const r of rows) {
                const email = (r['Email'] || '').trim();
                const name  = (r['Name']  || '').trim();
                const dept  = (r['Department'] || '').trim();
                if (email.toLowerCase().includes('director')) {
                    await insertUser(name, email, dept, 'Director',  'EMP-DIR', 'director');
                } else if (email.toLowerCase().includes('registrar')) {
                    await insertUser(name, email, dept, 'Registrar', 'EMP-REG', 'registrar');
                }
            }
            console.log('  ✔ Director & Registrar done.');
        }

        // ── 8. Deans ──────────────────────────────────────────────────────────
        const deansPath = path.join(usersDir, 'Deans.csv');
        if (fs.existsSync(deansPath)) {
            console.log('▶ Seeding Deans...');
            const rows = parseCSV(fs.readFileSync(deansPath, 'utf8'));
            let idx = 1;
            for (const r of rows) {
                const name  = (r['Name'] || r['Name '] || '').trim();
                const email = (r['Email'] || '').trim();
                const dept  = (r['Department'] || '').trim();
                await insertUser(name, email, dept, 'Dean', `EMP-DEAN-${idx++}`, 'dean');
            }
            console.log(`  ✔ ${idx - 1} Deans done.`);
        }

        // ── 9. HODs ───────────────────────────────────────────────────────────
        const hodsPath = path.join(usersDir, 'Hods.csv');
        if (fs.existsSync(hodsPath)) {
            console.log('▶ Seeding HODs...');
            const rows = parseCSV(fs.readFileSync(hodsPath, 'utf8'));
            let idx = 1;
            for (const r of rows) {
                const name  = (r['Name']  || '').trim();
                const email = (r['Email'] || '').trim();
                const dept  = (r['Department'] || '').trim();
                await insertUser(name, email, dept, 'HOD', `EMP-HOD-${idx++}`, 'hod');
            }
            console.log(`  ✔ ${idx - 1} HODs done.`);
        }

        // ── 10. Faculty ───────────────────────────────────────────────────────
        let facultyPath = path.join(usersDir, 'Faculty.csv');
        if (!fs.existsSync(facultyPath)) {
            const altPath = path.join(usersDir, 'emp details (2).csv');
            if (fs.existsSync(altPath)) {
                facultyPath = altPath;
            } else {
                facultyPath = null;
            }
        }

        if (facultyPath) {
            console.log(`▶ Seeding Faculty from ${path.basename(facultyPath)}...`);
            const rows = parseCSV(fs.readFileSync(facultyPath, 'utf8'));
            let count = 0;
            
            // Auto-detect format from the parsed keys of the first row
            const firstRow = rows[0] || {};
            const isAlternativeFormat = (firstRow['emp_email'] !== undefined || firstRow['emp_name'] !== undefined);
            
            for (const r of rows) {
                let userId, name, email, dept;
                if (isAlternativeFormat) {
                    userId = (r['emp_id'] || '').trim();
                    name   = (r['emp_name'] || '').trim();
                    email  = (r['emp_email'] || '').trim();
                    dept   = '';
                } else {
                    userId = (r['User ID'] || '').trim();
                    name   = (r['Name']    || '').trim();
                    email  = (r['Email']   || '').trim();
                    dept   = (r['Department'] || '').trim();
                }
                if (!name || !email) continue;
                await insertUser(name, email, dept, 'Faculty', userId ? `EMP-FAC-${userId}` : null, 'faculty');
                count++;
            }
            console.log(`  ✔ ${count} Faculty done.`);
        }

        // ── 11. Students (bulk COPY for speed — 7000+ rows) ───────────────────
        const studentsPath = path.join(usersDir, 'Students.csv');
        if (fs.existsSync(studentsPath)) {
            console.log('▶ Seeding Students (bulk insert)...');
            const rows = parseCSV(fs.readFileSync(studentsPath, 'utf8'));

            // Get student role_id
            const roleRes = await db.query(`SELECT role_id FROM roles WHERE role_name = 'student'`);
            const studentRoleId = roleRes.rows[0]?.role_id;

            let count = 0;
            // Batch in groups of 500 for speed
            const BATCH = 500;
            for (let i = 0; i < rows.length; i += BATCH) {
                const batch = rows.slice(i, i + BATCH);
                const validRows = batch.filter(r => r['Email'] && r['NAME']);

                if (!validRows.length) continue;

                // Build multi-row VALUES for users
                const userValues = validRows.map((r, j) => {
                    const offset = j * 5;
                    return `($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5})`;
                }).join(',');

                const userParams = validRows.flatMap(r => [
                    r['NAME'].trim(),
                    r['Email'].trim(),
                    (r['OU'] || '').trim(),
                    'Student',
                    (r['Enrolment Number'] || '').trim()
                ]);

                const insertedUsers = await db.query(`
                    INSERT INTO users (full_name, email, department, designation, employee_id)
                    VALUES ${userValues}
                    ON CONFLICT (email) DO UPDATE SET
                        full_name   = EXCLUDED.full_name,
                        department  = EXCLUDED.department,
                        designation = EXCLUDED.designation
                    RETURNING user_id;
                `, userParams);

                // Bulk insert roles
                if (insertedUsers.rows.length && studentRoleId) {
                    const roleValues = insertedUsers.rows.map((_, j) => `($${j*2+1}, $${j*2+2})`).join(',');
                    const roleParams = insertedUsers.rows.flatMap(row => [row.user_id, studentRoleId]);
                    await db.query(`
                        INSERT INTO user_roles (user_id, role_id)
                        VALUES ${roleValues}
                        ON CONFLICT (user_id, role_id) DO NOTHING;
                    `, roleParams);
                }
                count += validRows.length;
                process.stdout.write(`\r  Students: ${count}/${rows.length}`);
            }
            console.log(`\n  ✔ ${count} Students done.`);
        }
    }

    console.log('\n══════════════════════════════════════════');
    console.log(' ✅  Seeding complete!');
    console.log('══════════════════════════════════════════\n');
}

seed()
    .catch(err => { console.error('\n❌ Seed failed:', err); process.exit(1); })
    .finally(() => process.exit(0));
