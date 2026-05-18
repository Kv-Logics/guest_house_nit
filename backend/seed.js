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

  const now = new Date();
  const addTime = (days, hours=0) => new Date(now.getTime() + days * 86400000 + hours * 3600000);

  const sampleBookings = [
      { // 1. Pending Approver (Normal)
          applicant: 'moses@nitt.edu', approver: 'hodeee@nitt.edu', cat_id: 1, visit_type: 'official', purpose: 'Guest Lecturer for EEE',
          rooms: 1, room_type: 'Standard Room', status: 'PENDING_APPROVER',
          arrival: addTime(5), departure: addTime(7),
          guests: [{ name: 'Dr. Richard Feynman', relation: 'Guest' }]
      },
      { // 2. Pending Admin (Normal)
          applicant: 'keerthana241001@nitt.edu', approver: 'hodcse@nitt.edu', cat_id: 3, visit_type: 'personal', purpose: 'Parents Visit',
          rooms: 1, room_type: 'Standard Room', status: 'PENDING_ADMIN',
          arrival: addTime(10), departure: addTime(12),
          guests: [{ name: 'Mr. Subramanian', relation: 'Father' }, { name: 'Mrs. Lakshmi', relation: 'Mother' }]
      },
      { // 3. Admin Approved (Arriving Today)
          applicant: 'gs@nitt.edu', approver: 'deanap@nitt.edu', cat_id: 2, visit_type: 'official', purpose: 'Project Review',
          rooms: 2, room_type: 'Mini Suite Room', status: 'ADMIN_APPROVED',
          arrival: addTime(0, -1), departure: addTime(3), // Arrived 1 hr ago, not checked in yet
          guests: [{ name: 'Prof. HC Verma', relation: 'Reviewer' }, { name: 'Dr. RS Aggarwal', relation: 'Reviewer' }]
      },
      { // 4. Checked In (Active Stay)
          applicant: 'moses@nitt.edu', approver: 'director@nitt.edu', cat_id: 1, visit_type: 'official', purpose: 'Keynote Speaker',
          rooms: 1, room_type: 'Suite Room', status: 'CHECKED_IN',
          arrival: addTime(-1), departure: addTime(2), checked_in: addTime(-1, 2),
          guests: [{ name: 'Dr. Marie Curie', relation: 'Keynote Speaker' }]
      },
      { // 5. Checked In -> Extension Pending Approver
          applicant: 'kbaskar@nitt.edu', approver: 'hodmech@nitt.edu', cat_id: 2, visit_type: 'official', purpose: 'Research',
          rooms: 1, room_type: 'Standard Room', status: 'PENDING_APPROVER',
          arrival: addTime(-3), departure: addTime(0, 2), // Leaving in 2 hrs
          checked_in: addTime(-3, 1), is_extension: true, pending_ext: addTime(2, 2), // Extend by 2 days
          guests: [{ name: 'Dr. APJ Abdul Kalam', relation: 'Scientist' }]
      },
      { // 6. Checked In -> Extension Pending Admin
          applicant: 'nivetha240221@nitt.edu', approver: 'hodece@nitt.edu', cat_id: 3, visit_type: 'personal', purpose: 'Family Emergency',
          rooms: 1, room_type: 'Standard Room', status: 'PENDING_ADMIN',
          arrival: addTime(-2), departure: addTime(0, -1), // Overdue by 1 hr!
          checked_in: addTime(-2, 1), is_extension: true, pending_ext: addTime(1),
          guests: [{ name: 'Mrs. Saraswathi', relation: 'Mother' }]
      },
      { // 7. Checked Out (Past)
          applicant: 'nisha@nitt.edu', approver: 'registrar@nitt.edu', cat_id: 4, visit_type: 'personal', purpose: 'Vacation',
          rooms: 2, room_type: 'Standard Room', status: 'CHECKED_OUT',
          arrival: addTime(-10), departure: addTime(-5), checked_in: addTime(-10, 1), checked_out: addTime(-5, -2),
          guests: [{ name: 'Mr. Ramesh', relation: 'Brother' }, { name: 'Mrs. Suresh', relation: 'Sister-in-law' }]
      },
      { // 8. Approver Rejected
          applicant: 'rahul241114@nitt.edu', approver: 'hodece@nitt.edu', cat_id: 3, visit_type: 'personal', purpose: 'Sibling visiting',
          rooms: 1, room_type: 'Standard Room', status: 'APPROVER_REJECTED',
          arrival: addTime(14), departure: addTime(16),
          guests: [{ name: 'Ms. Priya', relation: 'Sister' }]
      },
      { // 9. Admin Rejected
          applicant: 'sanjay241332@nitt.edu', approver: 'hodcse@nitt.edu', cat_id: 3, visit_type: 'personal', purpose: 'Friend visiting',
          rooms: 1, room_type: 'Standard Room', status: 'ADMIN_REJECTED',
          arrival: addTime(20), departure: addTime(22),
          guests: [{ name: 'Mr. Vignesh', relation: 'Friend' }]
      },
      { // 10. Cancelled
          applicant: 'sams@nitt.edu', approver: 'hodmba@nitt.edu', cat_id: 2, visit_type: 'official', purpose: 'Audit',
          rooms: 1, room_type: 'Standard Room', status: 'CANCELLED',
          arrival: addTime(25), departure: addTime(27), cancelled: addTime(-1),
          guests: [{ name: 'Mr. Auditor', relation: 'Official' }]
      }
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
            INSERT INTO category_rules (category_id, category_code, allowed_applicant_roles, visit_type, max_rooms_allowed, max_guest_count, approval_hierarchy, payment_modes)
            VALUES 
            (1, 'CAT-I', '{faculty,staff,hod,dean,super_admin,guest_house_admin,reception_staff}', 'official', 5, 10, 'director_dean_registrar', '{"institute"}'),
            (2, 'CAT-II', '{faculty,hod,dean,super_admin,guest_house_admin,reception_staff}', 'official', 3, 6, 'dean_hod', '{"project","coordinator","guest"}'),
            (3, 'CAT-III', '{faculty,staff,student,super_admin,guest_house_admin,reception_staff}', 'both', 2, 4, 'faculty_staff', '{"guest","faculty"}'),
            (4, 'CAT-IV', '{faculty,staff,super_admin,guest_house_admin,reception_staff}', 'personal', 1, 2, 'registrar_hod', '{"guest"}')
            ON CONFLICT (category_id) DO UPDATE SET 
                category_code = EXCLUDED.category_code,
                allowed_applicant_roles = EXCLUDED.allowed_applicant_roles,
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
      const adminRes = await db.query(`SELECT user_id FROM users WHERE email = 'admin@nitt.edu'`);
      const adminId = adminRes.rows[0].user_id;

      const userRes = await db.query(`SELECT user_id FROM users WHERE email = $1`, [b.applicant]);
      const approverRes = await db.query(`SELECT user_id FROM users WHERE email = $1`, [b.approver]);
      if (userRes.rows.length === 0 || approverRes.rows.length === 0) continue;
      
      const userId = userRes.rows[0].user_id;
      const approverId = approverRes.rows[0].user_id;

      const reqRes = await db.query(
          `INSERT INTO booking_requests (
              user_id, category_id, purpose_of_visit, visit_type, room_priority,
              arrival_datetime, departure_datetime, rooms_required, room_type, total_estimated_amount,
              undertaking_accepted, booking_state, payment_responsible, assigned_approver_id,
              checked_in_at, checked_out_at, pending_extension_datetime, cancelled_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, $14, $15, $16, $17) RETURNING booking_id;`,
          [
              userId, b.cat_id, b.purpose, b.visit_type, b.room_type,
              b.arrival.toISOString(), b.departure.toISOString(), b.rooms, b.room_type, 1500,
              b.status, 'guest', approverId,
              b.checked_in ? b.checked_in.toISOString() : null,
              b.checked_out ? b.checked_out.toISOString() : null,
              b.pending_ext ? b.pending_ext.toISOString() : null,
              b.cancelled ? b.cancelled.toISOString() : null
          ]
      );
      const bookingId = reqRes.rows[0].booking_id;

      for (const g of b.guests) {
          await db.query(
              `INSERT INTO guests (booking_id, guest_name, relation_to_applicant, phone, gender, age, arrival_datetime, departure_datetime) VALUES ($1, $2, $3, $4, 'Male', 30, $5, $6)`,
              [bookingId, g.name, g.relation, '9999999999', b.arrival.toISOString(), b.departure.toISOString()]
          );
      }

      // Generate accurate Audit Logs
      await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, userId, 'SUBMITTED', 'Application submitted by the applicant.']);
      
      if (['PENDING_ADMIN', 'ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'ADMIN_REJECTED'].includes(b.status) || b.is_extension) {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, approverId, 'APPROVED', 'Approved by Authority.']);
      }
      if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status) || b.is_extension) {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, 'APPROVED', 'Verified and Approved by Admin.']);
      }
      if (b.status === 'APPROVER_REJECTED') {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, approverId, 'REJECTED', 'Cannot accommodate at this time.']);
      }
      if (b.status === 'ADMIN_REJECTED') {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, adminId, 'REJECTED', 'Payment missing or details invalid.']);
      }
      if (b.status === 'CANCELLED') {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, userId, 'CANCELLED', 'Cancelled by applicant.']);
      }
      if (b.pending_ext) {
          await db.query(`INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)`, [bookingId, userId, 'EXTENSION_REQUESTED', `Requested stay extension until ${b.pending_ext.toLocaleString()}.`]);
      }
    }
    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    process.exit();
  }
}

seedDatabase();