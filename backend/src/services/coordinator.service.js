const db = require('../db/db');
const logger = require('../utils/logger');

exports.getBookingFullDetails = async (bookingId) => {
    const client = await db.getClient();
    try {
        const bRes = await client.query(`
            SELECT br.*, a.full_name as applicant_name, a.email as applicant_email
            FROM booking_requests br
            LEFT JOIN users a ON br.user_id = a.user_id
            WHERE br.booking_id = $1
        `, [bookingId]);

        if (bRes.rows.length === 0) return null;
        const booking = bRes.rows[0];

        const gRes = await client.query(`
            SELECT * FROM guests WHERE booking_id = $1
        `, [bookingId]);
        const guests = gRes.rows;

        const fRes = await client.query(`
            SELECT fp.* 
            FROM guest_food_preferences fp
            JOIN guests g ON fp.guest_id = g.guest_id
            WHERE g.booking_id = $1
        `, [bookingId]);
        
        const rRes = await client.query(`
            SELECT * FROM guest_room_stays WHERE booking_id = $1
        `, [bookingId]);

        const billRes = await client.query(`
            SELECT * FROM final_bills WHERE booking_id = $1
        `, [bookingId]);

        return {
            ...booking,
            guests,
            food_preferences: fRes.rows,
            stays: rRes.rows,
            final_bill: billRes.rows[0] || null
        };
    } finally {
        client.release();
    }
};

exports.getModifiableBookings = async () => {
    const res = await db.query(`
        SELECT br.booking_id, br.formatted_id, br.arrival_datetime, br.departure_datetime, br.booking_state, 
               br.rooms_required, br.room_type, br.total_estimated_amount, br.allocated_room_numbers,
               u.full_name as applicant_name
        FROM booking_requests br
        LEFT JOIN users u ON br.user_id = u.user_id
        WHERE br.booking_state IN ('PENDING_ADMIN', 'ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT')
        ORDER BY br.arrival_datetime DESC
    `);
    return res.rows;
};

exports.processOverride = async (bookingId, payload, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Extract payload
        const { newTariff, newRoomType, newArrival, newDeparture, guestsToUpdate, newTotalAmount, overrideReason } = payload;

        // Log the override
        await client.query(`
            INSERT INTO audit_logs (user_id, action, target_entity, target_id, new_value, remarks)
            VALUES ($1, 'COORDINATOR_OVERRIDE', 'booking_requests', $2, $3, $4)
        `, [userId, bookingId, JSON.stringify(payload), overrideReason]);

        // Update booking core info
        await client.query(`
            UPDATE booking_requests
            SET room_type = COALESCE($1, room_type),
                arrival_datetime = COALESCE($2, arrival_datetime),
                departure_datetime = COALESCE($3, departure_datetime),
                total_estimated_amount = COALESCE($4, total_estimated_amount),
                updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = $5
        `, [newRoomType, newArrival, newDeparture, newTotalAmount, bookingId]);

        // If specific guests are updated
        if (guestsToUpdate && guestsToUpdate.length > 0) {
            for (const g of guestsToUpdate) {
                // Update stays or guests table
                if (g.guest_id) {
                    await client.query(`
                        UPDATE guests 
                        SET departure_datetime = COALESCE($1, departure_datetime),
                            preferred_occupancy = COALESCE($2, preferred_occupancy),
                            preferred_extra_bed = COALESCE($3, preferred_extra_bed),
                            room_index = COALESCE($6, room_index)
                        WHERE guest_id = $4 AND booking_id = $5
                    `, [g.departure_datetime, g.preferred_occupancy, g.preferred_extra_bed, g.guest_id, bookingId, g.room_index]);

                    await client.query(`
                        UPDATE guest_room_stays
                        SET operational_tariff = COALESCE($1, operational_tariff),
                            operational_room_type = COALESCE($2, operational_room_type),
                            occupancy_type = COALESCE($3, occupancy_type),
                            extra_bed = COALESCE($4, extra_bed)
                        WHERE guest_id = $5 AND booking_id = $6
                    `, [newTariff, newRoomType, g.preferred_occupancy, g.preferred_extra_bed, g.guest_id, bookingId]);
                }
            }
        }

        await client.query('COMMIT');
        return await this.getBookingFullDetails(bookingId);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.generateFinalBillSnapshot = async (bookingId, payload, userId) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { generated_json, subtotal, gst, total } = payload;

        // Upsert into final_bills
        await client.query(`
            INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, generated_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (booking_id) DO UPDATE SET
                generated_json = EXCLUDED.generated_json,
                subtotal = EXCLUDED.subtotal,
                gst = EXCLUDED.gst,
                total = EXCLUDED.total,
                generated_by = EXCLUDED.generated_by,
                generated_at = CURRENT_TIMESTAMP
        `, [bookingId, generated_json, subtotal, gst, total, userId]);

        // Update booking to reflect the absolute final amount
        await client.query(`
            UPDATE booking_requests
            SET total_estimated_amount = $1
            WHERE booking_id = $2
        `, [total, bookingId]);

        await client.query('COMMIT');
        return { success: true, total };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.getAllTariffsWithCategories = async () => {
    const res = await db.query(`
        SELECT rt.*, cr.category_code, cr.description as category_description 
        FROM room_tariffs rt
        JOIN category_rules cr ON rt.category_id = cr.category_id
        ORDER BY rt.category_id ASC, rt.room_type ASC
    `);
    return res.rows;
};

exports.updateTariff = async (tariffId, payload) => {
    const { single_occupancy, double_occupancy, extra_bed } = payload;
    const res = await db.query(`
        UPDATE room_tariffs
        SET single_occupancy = $1, double_occupancy = $2, extra_bed = $3, updated_at = CURRENT_TIMESTAMP
        WHERE tariff_id = $4
        RETURNING *
    `, [single_occupancy, double_occupancy, extra_bed, tariffId]);
    
    if (res.rows.length === 0) {
        throw new Error('Tariff not found');
    }
    return res.rows[0];
};
