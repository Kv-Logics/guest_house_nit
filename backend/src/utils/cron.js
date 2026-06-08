const db = require('../db/db');
const { BOOKING_STATUS } = require('./constants');
const logger = require('./logger');

async function autoCancelMissedBookings() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Find bookings that are ADMIN_APPROVED or READY_FOR_CHECKIN 
        // and whose departure_datetime has already passed
        const res = await client.query(`
            SELECT booking_id, user_id, formatted_id 
            FROM booking_requests 
            WHERE booking_state IN ($1, $2) 
            AND departure_datetime < CURRENT_TIMESTAMP
            FOR UPDATE SKIP LOCKED
        `, [BOOKING_STATUS.ADMIN_APPROVED, BOOKING_STATUS.READY_FOR_CHECKIN]);

        for (const row of res.rows) {
            // Cancel booking
            await client.query(`
                UPDATE booking_requests 
                SET booking_state = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE booking_id = $2
            `, [BOOKING_STATUS.CANCELLED, row.booking_id]);

            // Add approval log
            await client.query(`
                INSERT INTO approval_logs (booking_id, approver_id, action, comments) 
                VALUES ($1, $2, $3, $4)
            `, [
                row.booking_id, 
                row.user_id, // System action, but logged under user or admin? We can use the user_id or a system ID. Let's use user_id for simplicity or leave it NULL if DB allows.
                'CANCELLED_NO_SHOW', 
                'System Auto-Cancellation: Guest failed to check in by the scheduled checkout time.'
            ]);

            logger.info(`Auto-cancelled booking ${row.formatted_id} due to no-show.`);
            
            // Note: Email notification logic would be triggered here in a real prod env.
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error in autoCancelMissedBookings cron:', error);
    } finally {
        client.release();
    }
}

function initCronJobs() {
    // Run every hour (3600000 ms)
    setInterval(() => {
        autoCancelMissedBookings();
    }, 60 * 60 * 1000);

    // Also run once on startup
    setTimeout(() => {
        autoCancelMissedBookings();
    }, 10000); // 10 seconds after startup
}

module.exports = { initCronJobs, autoCancelMissedBookings };
