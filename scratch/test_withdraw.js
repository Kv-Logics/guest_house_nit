const db = require('../backend/src/db/db');
const { BOOKING_STATUS } = require('../backend/src/utils/constants');

async function testWithdraw() {
    try {
        console.log('Testing booking state change...');
        
        // Find an admin approved booking
        const res = await db.query("SELECT booking_id, booking_state FROM booking_requests WHERE booking_state = 'ADMIN_APPROVED' LIMIT 1");
        if (res.rows.length === 0) {
            console.log('No ADMIN_APPROVED bookings found.');
            return;
        }
        
        const bookingId = res.rows[0].booking_id;
        console.log(`Found booking ${bookingId} with state ${res.rows[0].booking_state}`);
        
        // Call the service method
        const bookingService = require('../backend/src/services/booking.service');
        const data = await bookingService.updateAdminStatus(bookingId, 'WITHDRAW', 'Test withdraw', 1); // User 1 is likely an admin
        
        console.log(`After withdraw, state is: ${data.booking_state}`);
        
        // Check if it's in the approved list
        const listRes = await bookingService.getAllBookingsForAdmin(20, 0, 'ADMIN_APPROVED', null, 'current', null);
        
        const found = listRes.rows.find(b => b.booking_id === bookingId);
        if (found) {
            console.log(`ERROR: Booking ${bookingId} is still in the ADMIN_APPROVED list with state ${found.booking_state}!`);
        } else {
            console.log(`SUCCESS: Booking ${bookingId} is no longer in the ADMIN_APPROVED list.`);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

testWithdraw();
