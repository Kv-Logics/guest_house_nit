require('dotenv').config({ path: 'c:/Users/keert/GuestHouse/guesthouse/backend/.env' });
const db = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/db/db');
const { requestStayExtension, cancelBooking } = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/services/booking.service');
const { approveBooking } = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/services/approval.service');

async function testStayExtensionFlow() {
    console.log('--- Starting Stay Extension Workflow Test ---');
    let testBookingId1 = null;
    let testBookingId2 = null;
    try {
        // Find users
        const studentRes = await db.query(`
            SELECT u.* FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
            WHERE r.role_name = 'student' LIMIT 1
        `);
        if (studentRes.rows.length === 0) {
            throw new Error('No student user found');
        }
        const studentUser = studentRes.rows[0];
        console.log(`Using student user: ${studentUser.username || studentUser.full_name} (${studentUser.user_id})`);

        const adminRes = await db.query(`
            SELECT u.* FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
            WHERE r.role_name = 'super_admin' LIMIT 1
        `);
        if (adminRes.rows.length === 0) {
            throw new Error('No super_admin user found');
        }
        const adminUser = adminRes.rows[0];
        console.log(`Using admin user: ${adminUser.username || adminUser.full_name} (${adminUser.user_id})`);

        const approverRes = await db.query(`
            SELECT u.*, r.role_name FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
            WHERE r.role_name NOT IN ('student', 'guest_house_admin', 'super_admin', 'receptionist') LIMIT 1
        `);
        if (approverRes.rows.length === 0) {
            throw new Error('No authority/approver user found');
        }
        const authUser = approverRes.rows[0];
        console.log(`Using approver user: ${authUser.username || authUser.full_name} (${authUser.user_id}) with role: ${authUser.role_name}`);

        // ==========================================
        // FLOW A: STUDENT STAY EXTENSION & WITHDRAWAL
        // ==========================================
        console.log('\n--- FLOW A: Student Stay Extension & Withdrawal ---');
        const insertBookingQuery1 = `
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, room_priority,
                arrival_datetime, departure_datetime, rooms_required, undertaking_accepted,
                booking_state, payment_responsible, room_type, extra_beds, total_estimated_amount,
                assigned_approver_id, checked_in_at, allocated_room_numbers
            ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 1, true,
                      'CHECKED_IN', 'guest', 'Standard Room', 0, 1000, $6, NOW() - INTERVAL '1 day', '201')
            RETURNING *;
        `;
        const bookingRes1 = await db.query(insertBookingQuery1, [studentUser.user_id, 1, 'Conference', 'personal', 'Standard Room', authUser.user_id]);
        const booking1 = bookingRes1.rows[0];
        testBookingId1 = booking1.booking_id;
        console.log(`Created student booking: ${booking1.booking_id}`);

        const extendDatetime1 = new Date(new Date(booking1.departure_datetime).getTime() + 86400000 * 2).toISOString().slice(0, 16); // +2 days
        console.log(`Requesting stay extension until ${extendDatetime1}...`);
        await requestStayExtension(booking1.booking_id, studentUser.user_id, extendDatetime1);

        let checkRes1 = await db.query('SELECT * FROM booking_requests WHERE booking_id = $1', [booking1.booking_id]);
        console.log(`State after request: ${checkRes1.rows[0].booking_state} (Expected: PENDING_APPROVER)`);
        if (checkRes1.rows[0].booking_state !== 'PENDING_APPROVER') {
            throw new Error('Expected booking_state to be PENDING_APPROVER');
        }

        console.log('Authority approving student stay extension...');
        await approveBooking(booking1.booking_id, authUser.user_id, 'APPROVED', 'HOD approval remarks');

        checkRes1 = await db.query('SELECT * FROM booking_requests WHERE booking_id = $1', [booking1.booking_id]);
        console.log(`State after HOD approval: ${checkRes1.rows[0].booking_state} (Expected: PENDING_ADMIN)`);
        if (checkRes1.rows[0].booking_state !== 'PENDING_ADMIN') {
            throw new Error('Expected state to transition to PENDING_ADMIN');
        }

        console.log('Withdrawing student stay extension...');
        await cancelBooking(booking1.booking_id, { user_id: studentUser.user_id, role: 'student' });

        checkRes1 = await db.query('SELECT * FROM booking_requests WHERE booking_id = $1', [booking1.booking_id]);
        console.log(`State after withdrawal: ${checkRes1.rows[0].booking_state} (Expected: CHECKED_IN)`);
        console.log(`Pending extension datetime: ${checkRes1.rows[0].pending_extension_datetime} (Expected: null)`);
        if (checkRes1.rows[0].booking_state !== 'CHECKED_IN' || checkRes1.rows[0].pending_extension_datetime !== null) {
            throw new Error('Withdrawal did not correctly revert student stay back to CHECKED_IN or clear pending date.');
        }
        console.log('✅ FLOW A completed successfully!');

        // ==========================================
        // FLOW B: ADMIN ROUTED EXTENSION TRANSITION
        // ==========================================
        console.log('\n--- FLOW B: Admin Routed Extension Transition ---');
        // Insert booking with PENDING_APPROVER state directly to simulate routed path
        const insertBookingQuery2 = `
            INSERT INTO booking_requests (
                user_id, category_id, purpose_of_visit, visit_type, room_priority,
                arrival_datetime, departure_datetime, rooms_required, undertaking_accepted,
                booking_state, payment_responsible, room_type, extra_beds, total_estimated_amount,
                assigned_approver_id, checked_in_at, allocated_room_numbers, pending_extension_datetime
            ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 1, true,
                      'PENDING_APPROVER', 'guest', 'Standard Room', 0, 1000, $6, NOW() - INTERVAL '1 day', '202', NOW() + INTERVAL '4 days')
            RETURNING *;
        `;
        const bookingRes2 = await db.query(insertBookingQuery2, [adminUser.user_id, 1, 'Official Visit', 'official', 'Standard Room', authUser.user_id]);
        const booking2 = bookingRes2.rows[0];
        testBookingId2 = booking2.booking_id;
        console.log(`Created admin routed booking: ${booking2.booking_id}`);

        console.log('Authority approving admin stay extension...');
        await approveBooking(booking2.booking_id, authUser.user_id, 'APPROVED', 'HOD approval remarks');

        let checkRes2 = await db.query('SELECT * FROM booking_requests WHERE booking_id = $1', [booking2.booking_id]);
        console.log(`State after HOD approval: ${checkRes2.rows[0].booking_state} (Expected: PENDING_ADMIN)`);
        if (checkRes2.rows[0].booking_state !== 'PENDING_ADMIN') {
            throw new Error('Expected admin stay extension HOD approval to transition to PENDING_ADMIN, not ADMIN_APPROVED.');
        }
        console.log('✅ FLOW B completed successfully!');

        console.log('\n--- All Tests Completed Successfully ---');
    } catch (err) {
        console.error('❌ Test failed with error:', err);
    } finally {
        if (testBookingId1) {
            await db.query('DELETE FROM approval_logs WHERE booking_id = $1', [testBookingId1]);
            await db.query('DELETE FROM booking_requests WHERE booking_id = $1', [testBookingId1]);
        }
        if (testBookingId2) {
            await db.query('DELETE FROM approval_logs WHERE booking_id = $1', [testBookingId2]);
            await db.query('DELETE FROM booking_requests WHERE booking_id = $1', [testBookingId2]);
        }
        console.log('Test bookings cleaned up.');
        db.pool.end();
    }
}

testStayExtensionFlow();
