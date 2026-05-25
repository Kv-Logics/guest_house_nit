const express = require('express');
const router = express.Router();

const receptionController = require('../controllers/reception.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.use(requireRole(['reception_staff', 'super_admin', 'guest_house_admin']));

router.get('/arrivals', receptionController.getTodayArrivals);
router.get('/rooms', receptionController.getRoomsWithStays);
router.post('/rooms/:roomNumber/status', receptionController.updateRoomStatus);

// Production safety stays endpoints ΓÇö must be BEFORE /:id wildcard routes
router.post('/rooms/transfer', receptionController.roomTransfer);
router.post('/rooms/override', receptionController.overrideStayBilling);
router.get('/bookings/:bookingId/override-logs', receptionController.getBillingOverrideLogsByBooking);
router.post('/bookings/:bookingId/extend', receptionController.extendStay);

router.post('/stays/:stayId/check-out', receptionController.checkOutStay);

// Wildcard routes LAST to avoid capturing /rooms/transfer etc.
router.post('/:id/assign-rooms', receptionController.assignRooms);
router.post('/:id/check-in', receptionController.checkIn);
router.post('/:id/check-out', receptionController.checkOut);
router.post('/guests/:guestId/check-in', receptionController.checkInGuest);
router.patch('/guests/:guestId', receptionController.updateGuestTimes);

module.exports = router;