const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/db/db');
const receptionService = require('../src/services/reception.service');

async function run() {
    try {
        console.log("Looking up booking for sequence 11...");
        const res = await db.query(`
            SELECT booking_id, booking_seq, booking_state, payment_state 
            FROM booking_requests 
            WHERE booking_seq = 11
        `);
        
        if (res.rows.length === 0) {
            console.log("Booking sequence 11 not found!");
            return;
        }
        
        const booking = res.rows[0];
        console.log("Found Booking:", booking);
        const bookingId = booking.booking_id;
        
        // 1. Delete stale bill
        console.log("Deleting stale final bill...");
        const delRes = await db.query(`DELETE FROM final_bills WHERE booking_id = $1 RETURNING *`, [bookingId]);
        console.log("Deleted final bill row:", delRes.rows[0]);
        
        // 2. Query stays for this booking
        const staysRes = await db.query(`
            SELECT grs.stay_id, grs.guest_id, g.guest_name, grs.checked_in_at, grs.checked_out_at, grs.stay_status
            FROM guest_room_stays grs
            JOIN guests g ON grs.guest_id = g.guest_id
            WHERE grs.booking_id = $1
        `, [bookingId]);
        console.log("Stays for this booking:", staysRes.rows);
        
        // 3. Trigger recalculation
        console.log("Calculating fresh bill...");
        const freshBill = await receptionService.calculateBookingBilling(bookingId, null, null, true);
        console.log("Fresh Bill Subtotal:", freshBill.subtotal);
        console.log("Fresh Bill Total:", freshBill.total);
        console.log("Fresh Bill Breakdown Stays:", JSON.stringify(freshBill.breakdown?.roomDaysBreakdown, null, 2));

        // 4. Save the correct final bill snapshot so it displays correctly immediately
        console.log("Saving the correct final bill snapshot...");
        await db.query(`
            INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, billing_type, company_name, gstin, company_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            bookingId, 
            JSON.stringify(freshBill.breakdown), 
            freshBill.subtotal, 
            freshBill.total - freshBill.subtotal, 
            freshBill.total, 
            'B2C', 
            null, 
            null, 
            null
        ]);
        console.log("Successfully saved correct final bill.");

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
