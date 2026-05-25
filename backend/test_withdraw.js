const { updateAdminStatus } = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/services/booking.service');
const db = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/db/db');

async function testWithdraw() {
    try {
        console.log('--- Starting Rejection Withdrawal Backend Test ---');
        
        // 1. Fetch any booking
        const res = await db.query('SELECT booking_id, booking_state, user_id FROM booking_requests LIMIT 1');
        if (!res.rows.length) {
            console.log('No bookings found in database to test with.');
            process.exit(0);
        }
        
        const booking = res.rows[0];
        const bookingId = booking.booking_id;
        const testUserId = booking.user_id;
        console.log(`Using Booking ID: ${bookingId}, Initial State: ${booking.booking_state}`);
        
        // 2. Set to ADMIN_REJECTED manually to simulate a rejection
        await db.query("UPDATE booking_requests SET booking_state = 'ADMIN_REJECTED' WHERE booking_id = $1", [bookingId]);
        console.log('Transitioned simulated state to: ADMIN_REJECTED');
        
        // 3. Call updateAdminStatus with WITHDRAW
        console.log('Executing updateAdminStatus with WITHDRAW action...');
        const updated = await updateAdminStatus(bookingId, 'WITHDRAW', 'Reverting accidental rejection', testUserId);
        
        console.log(`Resulting State: ${updated.booking_state}`);
        if (updated.booking_state === 'PENDING_ADMIN') {
            console.log('✅ SUCCESS: Booking state reverted to PENDING_ADMIN!');
        } else {
            console.error('❌ FAILURE: Unexpected booking state:', updated.booking_state);
        }
        
        // 4. Verify log entry
        const logs = await db.query('SELECT action, comments FROM approval_logs WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1', [bookingId]);
        if (logs.rows.length && logs.rows[0].action === 'WITHDRAW') {
            console.log('✅ SUCCESS: approval_logs entry created with WITHDRAW action!');
        } else {
            console.error('❌ FAILURE: No matching log found. Last log:', logs.rows[0]);
        }
        
        // Cleanup: Revert to original state
        await db.query('UPDATE booking_requests SET booking_state = $1 WHERE booking_id = $2', [booking.booking_state, bookingId]);
        console.log('Simulated booking cleaned up successfully.');
        
    } catch (err) {
        console.error('❌ Test failed with error:', err);
    } finally {
        db.pool.end();
        console.log('--- Test Finished ---');
    }
}

testWithdraw();
