const express = require('express');
const router = express.Router();
const bulkBookingService = require('../services/bulkBookingService');
const receptionService = require('../services/reception.service');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { sendSuccess } = require('../utils/response');

// All bulk booking routes require reception or admin roles
const bulkBookingRoles = ['reception_staff', 'super_admin', 'guest_house_admin', 'gh_coordinator'];

router.use(requireAuth);
router.use(requireRole(bulkBookingRoles));

// Create Bulk Booking
router.post('/', async (req, res, next) => {
    try {
        const result = await bulkBookingService.createBulkBooking(req.body, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Bulk booking draft created successfully', result, 201);
    } catch (error) {
        next(error);
    }
});

// List Bulk Bookings
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, statusFilter, searchQuery } = req.query;
        const result = await bulkBookingService.getBulkBookings(limit, offset, statusFilter, searchQuery);
        return sendSuccess(res, 'Bulk bookings retrieved successfully', result);
    } catch (error) {
        next(error);
    }
});

// Get Bulk Booking Details
router.get('/:id', async (req, res, next) => {
    try {
        const result = await bulkBookingService.getBulkBookingDetails(req.params.id);
        return sendSuccess(res, 'Bulk booking details retrieved successfully', result);
    } catch (error) {
        next(error);
    }
});

// Delete Bulk Booking
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await bulkBookingService.deleteBulkBooking(req.params.id, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Bulk booking deleted successfully', result);
    } catch (error) {
        next(error);
    }
});

// Update Bulk Booking Draft
router.put('/:id', async (req, res, next) => {
    try {
        const result = await bulkBookingService.saveBulkBookingDraft(req.params.id, req.body, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Bulk booking draft updated successfully', result);
    } catch (error) {
        next(error);
    }
});

// Submit Bulk Booking
router.post('/:id/submit', async (req, res, next) => {
    try {
        const result = await bulkBookingService.submitBulkBooking(req.params.id, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Bulk booking submitted successfully', result);
    } catch (error) {
        next(error);
    }
});

// Add Guests
router.post('/:id/guests', async (req, res, next) => {
    try {
        const result = await bulkBookingService.addGuestsToBulkBooking(req.params.id, req.body.guests, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Guests added successfully', result, 201);
    } catch (error) {
        next(error);
    }
});

// Update Guest
router.put('/:id/guests/:guestId', async (req, res, next) => {
    try {
        const result = await bulkBookingService.updateBulkBookingGuest(req.params.id, req.params.guestId, req.body, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Guest details updated successfully', result);
    } catch (error) {
        next(error);
    }
});

// Remove Guest
router.delete('/:id/guests/:guestId', async (req, res, next) => {
    try {
        const result = await bulkBookingService.removeGuestFromBulkBooking(req.params.id, req.params.guestId, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Guest removed successfully', result);
    } catch (error) {
        next(error);
    }
});

// Add Additional Rooms to Bulk Booking Block
router.post('/:id/rooms', async (req, res, next) => {
    try {
        const result = await bulkBookingService.addRoomsToBulkBooking(req.params.id, req.body.roomIds, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Rooms added to bulk booking successfully', result);
    } catch (error) {
        next(error);
    }
});

// PROXY ROUTES TO RECEPTION SERVICE

// Allocate Rooms
router.post('/:id/allocate-rooms', async (req, res, next) => {
    try {
        const db = require('../db/db');
        const roomsArray = req.body.rooms || [];
        let userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        if (typeof userId !== 'string') userId = String(userId);
        if (userId.length > 120) userId = userId.substring(0, 120);

        // 1. Get the booking's currently allocated rooms
        const bookingRes = await db.query('SELECT allocated_room_numbers FROM booking_requests WHERE booking_id = $1', [req.params.id]);
        if (bookingRes.rows.length === 0) {
            throw new Error('Booking request not found.');
        }
        const booking = bookingRes.rows[0];
        const heldRoomsStr = booking.allocated_room_numbers || '';
        const heldRooms = heldRoomsStr.split(',').map(r => r.trim()).filter(Boolean);

        // 2. Update guest room_index based on heldRooms, and append any new rooms to heldRooms
        for (const allocation of roomsArray) {
            if (allocation.guestId && allocation.roomNumber) {
                let idx = heldRooms.indexOf(allocation.roomNumber);
                if (idx === -1) {
                    heldRooms.push(allocation.roomNumber);
                    idx = heldRooms.length - 1;
                }
                await db.query(
                    'UPDATE guests SET room_index = $1, updated_at = CURRENT_TIMESTAMP WHERE guest_id = $2 AND booking_id = $3',
                    [idx, allocation.guestId, req.params.id]
                );
            }
        }

        // 3. Make sure all heldRooms are assigned to the booking request
        const updatedRoomsStr = heldRooms.join(',');
        const result = await receptionService.assignRooms(req.params.id, updatedRoomsStr, userId);

        return sendSuccess(res, 'Rooms allocated successfully', result);
    } catch (error) {
        next(error);
    }
});

// Check-In All
router.post('/:id/check-in', async (req, res, next) => {
    try {
        const roomsArray = req.body.guestRoomAssignments || [];
        const uniqueRoomNumbers = Array.from(new Set(roomsArray.map(r => r.roomNumber).filter(Boolean)));
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        const result = await receptionService.checkIn(req.params.id, uniqueRoomNumbers.join(','), userId);
        return sendSuccess(res, 'Check-in completed successfully', result);
    } catch (error) {
        next(error);
    }
});

// Check-In Individual Guest
router.post('/:id/check-in-guest/:stayId', async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        const result = await receptionService.checkInGuest(req.params.stayId, userId);
        return sendSuccess(res, 'Guest checked in successfully', result);
    } catch (error) {
        next(error);
    }
});

// Check-Out All
router.post('/:id/check-out', async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        const result = await receptionService.checkOut(req.params.id, userId);
        return sendSuccess(res, 'Check-out completed successfully', result);
    } catch (error) {
        next(error);
    }
});

// Check-Out Individual Guest
router.post('/:id/check-out-guest/:stayId', async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        const overrideNow = req.headers['x-mock-date'] || req.body?.overrideNow || null;
        const result = await receptionService.checkOutStay(req.params.stayId, userId, overrideNow, req.body);
        return sendSuccess(res, 'Guest checked out successfully', result);
    } catch (error) {
        next(error);
    }
});

// Generate Bill
router.post('/:id/generate-bill', async (req, res, next) => {
    try {
        const db = require('../config/database');
        const bookingId = req.params.id;
        const payload = req.body || {};
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';

        // Check if bill already exists
        const billCheck = await db.query('SELECT * FROM final_bills WHERE booking_id = $1', [bookingId]);
        if (billCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Bill already generated for this booking' });
        }

        // Calculate and insert
        const billing = await receptionService.calculateBookingBilling(bookingId);
        
        await db.query(`
            INSERT INTO final_bills (booking_id, generated_json, subtotal, gst, total, billing_type, company_name, gstin, company_address, generated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            bookingId, 
            JSON.stringify(billing.breakdown), 
            billing.subtotal, 
            billing.gst, 
            billing.total,
            payload.billing_type || 'B2C',
            payload.company_name || null,
            payload.gstin || null,
            payload.company_address || null,
            userId
        ]);

        return sendSuccess(res, 'Billing generated successfully', billing);
    } catch (error) {
        next(error);
    }
});

// Complete Payment (POS/Cash)
router.post('/:id/complete-payment', async (req, res, next) => {
    try {
        const userId = req.user?.user_id || req.user?.id || 'SYSTEM';
        const result = await receptionService.confirmPayment(req.params.id, req.body, userId);
        return sendSuccess(res, 'Payment completed successfully', result);
    } catch (error) {
        next(error);
    }
});

// Update stay occupancy
router.post('/:id/stays/:stayId/update-occupancy', async (req, res, next) => {
    try {
        const result = await receptionService.overrideStayBilling(req.params.stayId, req.user.user_id || req.user.id, req.body);
        return sendSuccess(res, 'Stay occupancy details updated successfully', result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
