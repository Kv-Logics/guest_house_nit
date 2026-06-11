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

        // Log the override (skip for category 1)
        const catRes = await client.query('SELECT category_id FROM booking_requests WHERE booking_id = $1', [bookingId]);
        const isCat1 = catRes.rows.length > 0 && catRes.rows[0].category_id === 1;
        if (!isCat1) {
            await client.query(`
                INSERT INTO audit_logs (user_id, action, target_entity, target_id, new_value, remarks)
                VALUES ($1, 'COORDINATOR_OVERRIDE', 'booking_requests', $2, $3, $4)
            `, [userId, bookingId, JSON.stringify(payload), overrideReason]);
        }

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

        const catRes = await client.query('SELECT category_id FROM booking_requests WHERE booking_id = $1', [bookingId]);
        const isCat1 = catRes.rows.length > 0 && catRes.rows[0].category_id === 1;

        if (!isCat1) {
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
        } else {
            // Category 1: force amount to 0
            await client.query(`
                UPDATE booking_requests
                SET total_estimated_amount = 0
                WHERE booking_id = $1
            `, [bookingId]);
        }

        await client.query('COMMIT');

        // Delete stale PDF so it regenerates on next GET
        const fs = require('fs');
        const path = require('path');
        const bRes = await client.query('SELECT formatted_id FROM booking_requests WHERE booking_id = $1', [bookingId]);
        const formattedId = bRes.rows[0]?.formatted_id;
        const safeFilename = formattedId ? formattedId.replace(/[^a-zA-Z0-9-_]/g, '_') : bookingId;
        const stalePdfPath = path.join(process.cwd(), 'uploads/invoices', `${safeFilename}.pdf`);
        if (fs.existsSync(stalePdfPath)) {
            fs.unlinkSync(stalePdfPath);
        }

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

exports.getUsers = async (searchQuery) => {
    let query = `
        SELECT u.*, r.role_name, r.role_id
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.deleted_at IS NULL
    `;
    const params = [];
    if (searchQuery) {
        query += ` AND (u.email ILIKE $1 OR u.full_name ILIKE $1 OR u.employee_id ILIKE $1)`;
        params.push(`%${searchQuery}%`);
    }
    query += ` ORDER BY u.created_at DESC LIMIT 100`;
    
    const res = await db.query(query, params);
    return res.rows;
};

exports.createUser = async (userData) => {
    const { full_name, email, department, designation, employee_id, role_id } = userData;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Insert user
        const uRes = await client.query(`
            INSERT INTO users (full_name, email, department, designation, employee_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [full_name, email, department, designation, employee_id]);
        
        const user = uRes.rows[0];
        
        // Insert role
        if (role_id) {
            await client.query(`
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
            `, [user.user_id, role_id]);
        }
        
        await client.query('COMMIT');
        return user;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.updateUser = async (userId, userData) => {
    const { full_name, email, department, designation, employee_id, role_id } = userData;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Update user details
        const uRes = await client.query(`
            UPDATE users
            SET full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                department = COALESCE($3, department),
                designation = COALESCE($4, designation),
                employee_id = COALESCE($5, employee_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6
            RETURNING *
        `, [full_name, email, department, designation, employee_id, userId]);
        
        if (uRes.rows.length === 0) {
            throw new Error('User not found');
        }
        
        // Update role (delete old, insert new)
        if (role_id) {
            await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
            await client.query(`
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
            `, [userId, role_id]);
        }
        
        await client.query('COMMIT');
        return uRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.deleteUser = async (userId) => {
    // Soft delete or hard delete? Since DB has a deleted_at, let's do soft delete
    const res = await db.query(`
        UPDATE users
        SET deleted_at = CURRENT_TIMESTAMP, is_active = false
        WHERE user_id = $1
        RETURNING *
    `, [userId]);
    
    if (res.rows.length === 0) {
        throw new Error('User not found');
    }
    return res.rows[0];
};

exports.getAllRoles = async () => {
    const res = await db.query(`SELECT role_id, role_name, description FROM roles ORDER BY role_name ASC`);
    return res.rows;
};

exports.addRoom = async (roomData) => {
    const { room_number, block_name, floor_number, room_type, capacity, has_ac, tariffs } = roomData;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Insert room into rooms table
        const roomRes = await client.query(`
            INSERT INTO rooms (room_number, block_name, floor_number, room_type, capacity, has_ac, current_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'available')
            ON CONFLICT (room_number) DO UPDATE SET
                block_name = EXCLUDED.block_name,
                floor_number = EXCLUDED.floor_number,
                room_type = EXCLUDED.room_type,
                capacity = EXCLUDED.capacity,
                has_ac = EXCLUDED.has_ac
            RETURNING *
        `, [room_number, block_name || 'Main Block', Number(floor_number || 0), room_type || 'Standard Room', Number(capacity || 2), has_ac !== false]);

        const room = roomRes.rows[0];

        // 2. Insert/update tariffs for Category 1, 2, 3, 4 if specified
        if (tariffs) {
            for (const catId of [1, 2, 3, 4]) {
                const catTariff = tariffs[catId];
                if (catTariff) {
                    const checkTariff = await client.query(`
                        SELECT tariff_id FROM room_tariffs 
                        WHERE category_id = $1 AND room_type = $2
                    `, [catId, room.room_type]);

                    if (checkTariff.rows.length > 0) {
                        await client.query(`
                            UPDATE room_tariffs 
                            SET single_occupancy = $1, double_occupancy = $2, extra_bed = $3, updated_at = CURRENT_TIMESTAMP
                            WHERE tariff_id = $4
                        `, [Number(catTariff.single), Number(catTariff.double), Number(catTariff.extra_bed || 400), checkTariff.rows[0].tariff_id]);
                    } else {
                        await client.query(`
                            INSERT INTO room_tariffs (category_id, room_type, single_occupancy, double_occupancy, extra_bed)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [catId, room.room_type, Number(catTariff.single), Number(catTariff.double), Number(catTariff.extra_bed || 400)]);
                    }
                }
            }
        }

        await client.query('COMMIT');
        return room;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

