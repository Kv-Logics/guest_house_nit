const db = require('./src/db/db');

async function seedDatabase() {
  // =========================================================================
  // EDITABLE SAMPLE DATA FOR EASY TESTING
  // =========================================================================
  const sampleUsers = [
    {
      full_name: 'G. Aghila',
      email: 'director@nitt.edu',
      role: 'director',
      dept: 'Administration',
      desig: 'Director',
      emp_id: 'EMP-DIR',
    },
    {
      full_name: 'S. A. Senthil Kumar',
      email: 'registrar@nitt.edu',
      role: 'registrar',
      dept: 'Administration',
      desig: 'Registrar',
      emp_id: 'EMP-REG',
    },
    {
      full_name: 'S. T. Ramesh',
      email: 'deanap@nitt.edu',
      role: 'dean',
      dept: 'Academic Affairs',
      desig: 'Dean',
      emp_id: 'EMP-DEAN',
    },
    {
      full_name: 'Kunwar Singh',
      email: 'hodcse@nitt.edu',
      role: 'hod',
      dept: 'Computer Science & Engineering',
      desig: 'HOD',
      emp_id: 'EMP-HOD1',
    },
    {
      full_name: 'Sishaj P Simon',
      email: 'hodeee@nitt.edu',
      role: 'hod',
      dept: 'Electrical & Electronics Engineering',
      desig: 'HOD',
      emp_id: 'EMP-HOD2',
    },
    {
      full_name: 'R. Pandeeswari',
      email: 'hodece@nitt.edu',
      role: 'hod',
      dept: 'Electronics & Communication Engineering',
      desig: 'HOD',
      emp_id: 'EMP-HOD3',
    },
    {
      full_name: 'S. Suresh',
      email: 'hodmech@nitt.edu',
      role: 'hod',
      dept: 'Mechanical Engineering',
      desig: 'HOD',
      emp_id: 'EMP-HOD4',
    },
    {
      full_name: 'P. Sridevi',
      email: 'hodmba@nitt.edu',
      role: 'hod',
      dept: 'Management Studies',
      desig: 'HOD',
      emp_id: 'EMP-HOD5',
    },
    {
      full_name: 'S. Moses Santhakumar',
      email: 'moses@nitt.edu',
      role: 'faculty',
      dept: 'Civil Engineering',
      desig: 'Faculty',
      emp_id: 'EMP-FAC1',
    },
    {
      full_name: 'G. Swaminathan',
      email: 'gs@nitt.edu',
      role: 'faculty',
      dept: 'Civil Engineering',
      desig: 'Faculty',
      emp_id: 'EMP-FAC2',
    },
    {
      full_name: 'Samson Mathew',
      email: 'sams@nitt.edu',
      role: 'faculty',
      dept: 'Civil Engineering',
      desig: 'Faculty',
      emp_id: 'EMP-FAC3',
    },
    {
      full_name: 'K. Baskar',
      email: 'kbaskar@nitt.edu',
      role: 'faculty',
      dept: 'Civil Engineering',
      desig: 'Faculty',
      emp_id: 'EMP-FAC4',
    },
    {
      full_name: 'Nisha Radhakrishnan',
      email: 'nisha@nitt.edu',
      role: 'faculty',
      dept: 'Civil Engineering',
      desig: 'Faculty',
      emp_id: 'EMP-FAC5',
    },
    {
      full_name: 'Keerthana S',
      email: 'keerthana241001@nitt.edu',
      role: 'student',
      dept: 'B.Tech CSE',
      desig: 'Student',
      emp_id: 'STU-1',
    },
    {
      full_name: 'Rahul V',
      email: 'rahul241114@nitt.edu',
      role: 'student',
      dept: 'B.Tech ECE',
      desig: 'Student',
      emp_id: 'STU-2',
    },
    {
      full_name: 'Nivetha R',
      email: 'nivetha240221@nitt.edu',
      role: 'student',
      dept: 'M.Tech VLSI',
      desig: 'Student',
      emp_id: 'STU-3',
    },
    {
      full_name: 'Aravind K',
      email: 'aravind240045@nitt.edu',
      role: 'student',
      dept: 'MBA',
      desig: 'Student',
      emp_id: 'STU-4',
    },
    {
      full_name: 'Sanjay M',
      email: 'sanjay241332@nitt.edu',
      role: 'student',
      dept: 'MCA',
      desig: 'Student',
      emp_id: 'STU-5',
    },
    {
      full_name: 'Admin User',
      email: 'admin@nitt.edu',
      role: 'super_admin',
      dept: 'Administration',
      desig: 'Guest House Admin',
      emp_id: 'EMP-001',
    },
    {
      full_name: 'Receptionist',
      email: 'reception@nitt.edu',
      role: 'reception_staff',
      dept: 'Guest House',
      desig: 'Front Desk',
      emp_id: 'EMP-006',
    },
  ];

  // Short stay windows for local testing (check-in, checkout, extension banners).
  // Adjust these strings (PostgreSQL interval syntax) as needed.
  const seedArrivalOffset = '10 minutes';
  const seedDepartureOffset = '35 minutes';

  const sampleBookings = [
    {
      applicant_email: 'moses@nitt.edu',
      cat_id: 2,
      visit_type: 'official',
      purpose: 'Conference Visit',
      rooms: 1,
      status: 'PENDING_APPROVER',
      stage: 'PENDING_DEAN',
      guest_name: 'Prof. Alan Turing',
      guest_phone: '9876543210',
    },
    {
      applicant_email: 'keerthana241001@nitt.edu',
      cat_id: 3,
      visit_type: 'personal',
      purpose: 'Parent Visit',
      rooms: 1,
      status: 'PENDING_APPROVER',
      stage: 'PENDING_HOD',
      guest_name: 'Mr. John Doe (Parent)',
      guest_phone: '1234567890',
    },
    {
      applicant_email: 'hodcse@nitt.edu',
      cat_id: 1,
      visit_type: 'official',
      purpose: 'Institute Guest Lecturer',
      rooms: 2,
      status: 'PENDING_APPROVER',
      stage: 'PENDING_REGISTRAR',
      guest_name: 'Dr. Albert Einstein',
      guest_phone: '5555555555',
    },
  ];
  // =========================================================================

  try {
    console.log('Seeding database...');

    // 0. Clean old sample bookings to avoid clutter during reseeding
    await db.query(`DELETE FROM refunds`);
    await db.query(`DELETE FROM notifications`);
    await db.query(`DELETE FROM sponsorship_requests`);
    await db.query(`DELETE FROM approval_logs`);
    await db.query(`DELETE FROM payments`);
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM guests`);
    await db.query(`DELETE FROM booking_requests`);
    await db.query(`DELETE FROM room_tariffs`);
    await db.query(`DELETE FROM users`);

    // 1. Insert RBAC Roles
    await db.query(`
            INSERT INTO roles (role_id, role_name, description) VALUES 
            (1, 'super_admin', 'System Administrator'),
            (2, 'guest_house_admin', 'Guest House Manager'),
            (3, 'reception_staff', 'Front Desk Staff'),
            (4, 'registrar', 'Registrar'),
            (5, 'dean', 'Dean'),
            (6, 'hod', 'Head of Department'),
            (7, 'faculty', 'Faculty Member'),
            (8, 'staff', 'Staff Member'),
            (9, 'student', 'Student'),
            (10, 'director', 'Director')
            ON CONFLICT (role_id) DO UPDATE SET
                role_name = EXCLUDED.role_name, 
                description = EXCLUDED.description;
        `);

    // 2. Insert Sample Users dynamically
    for (const u of sampleUsers) {
      const userRes = await db.query(
        `
                INSERT INTO users (full_name, email, department, designation, employee_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO UPDATE SET 
                    full_name = EXCLUDED.full_name,
                    department = EXCLUDED.department, 
                    designation = EXCLUDED.designation
                RETURNING user_id;
            `,
        [u.full_name, u.email, u.dept, u.desig, u.emp_id]
      );

      const userId = userRes.rows[0].user_id;
      await db.query(
        `
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, role_id FROM roles WHERE role_name = $2
                ON CONFLICT (user_id, role_id) DO NOTHING;
            `,
        [userId, u.role]
      );
    }

    // 3. Insert Full Category Intelligence
    await db.query(`
            INSERT INTO category_rules (category_id, category_code, allowed_applicant_roles, requires_project_code, visit_type, max_rooms_allowed, max_guest_count, approval_hierarchy, payment_modes)
            VALUES 
            (1, 'CAT-I', '{faculty,staff,hod,dean,super_admin,guest_house_admin,reception_staff}', false, 'official', 5, 10, 'director_dean_registrar', '{"institute"}'),
            (2, 'CAT-II', '{faculty,hod,dean,super_admin,guest_house_admin,reception_staff}', true, 'official', 3, 6, 'dean_hod', '{"project","coordinator","guest"}'),
            (3, 'CAT-III', '{faculty,staff,student,super_admin,guest_house_admin,reception_staff}', false, 'both', 2, 4, 'faculty_staff', '{"guest","faculty"}'),
            (4, 'CAT-IV', '{faculty,staff,super_admin,guest_house_admin,reception_staff}', false, 'personal', 1, 2, 'registrar_hod', '{"guest"}')
            ON CONFLICT (category_id) DO UPDATE SET 
                category_code = EXCLUDED.category_code,
                allowed_applicant_roles = EXCLUDED.allowed_applicant_roles,
                requires_project_code = EXCLUDED.requires_project_code,
                visit_type = EXCLUDED.visit_type,
                max_rooms_allowed = EXCLUDED.max_rooms_allowed,
                max_guest_count = EXCLUDED.max_guest_count,
                approval_hierarchy = EXCLUDED.approval_hierarchy,
                payment_modes = EXCLUDED.payment_modes;
        `);

    // 3.5 Insert Room Tariffs
    await db.query(`
            INSERT INTO room_tariffs (category_id, room_type, single_occupancy, double_occupancy, extra_bed) VALUES
            (1, 'Suite Room', 5500, 5500, 400),
            (2, 'Suite Room', 5500, 5500, 400),
            (3, 'Suite Room', 5500, 5500, 400),
            (4, 'Suite Room', 5500, 5500, 400),

            (1, 'Mini Suite Room', 4000, 4000, 400),
            (2, 'Mini Suite Room', 4000, 4000, 400),
            (3, 'Mini Suite Room', 4000, 4000, 400),
            (4, 'Mini Suite Room', 4000, 4000, 400),

            (1, 'Standard Room', 1000, 1600, 400),
            (2, 'Standard Room', 1100, 1800, 400),
            (3, 'Standard Room', 1200, 2000, 400),
            (4, 'Standard Room', 2600, 2600, 400)
        `);

    // 4. Insert Sample Bookings for Admin Dashboard Testing
    for (const b of sampleBookings) {
      // Get user id
      const userRes = await db.query(`SELECT user_id FROM users WHERE email = $1`, [
        b.applicant_email,
      ]);
      if (userRes.rows.length === 0) continue;

      const reqRes = await db.query(
        `
                INSERT INTO booking_requests (user_id, category_id, purpose_of_visit, visit_type, arrival_datetime, departure_datetime, rooms_required, undertaking_accepted, booking_state, payment_responsible)
                VALUES ($1, $2, $3, $4, NOW() + $7::interval, NOW() + $8::interval, $5, true, $6, 'guest')
                RETURNING booking_id;
            `,
        [
          userRes.rows[0].user_id,
          b.cat_id,
          b.purpose,
          b.visit_type,
          b.rooms,
          b.status,
          seedArrivalOffset,
          seedDepartureOffset,
        ]
      );

      await db.query(
        `
                INSERT INTO guests (booking_id, guest_name, phone, relation_to_applicant)
                VALUES ($1, $2, $3, 'Guest')
            `,
        [reqRes.rows[0].booking_id, b.guest_name, b.guest_phone]
      );
    }

    console.log('✅ Seeding Complete! Sample Bookings and Users injected.\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  } finally {
    process.exit();
  }
}

seedDatabase();
