const express = require('express');
const router = express.Router();

const receptionController = require('../controllers/reception.controller');
const invoiceController = require('../billing/invoice.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);

// --- INVOICE DOWNLOAD (Admin, Coordinator, Receptionist, User) ---
router.get(
  '/billing/invoice/:bookingId',
  requireRole(['super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff', 'user']),
  invoiceController.downloadInvoice
);

// --- CONFIRM DESK SETTLEMENT (RECEPTIONIST ONLY) ---
router.post(
  '/bookings/:bookingId/confirm-payment',
  requireRole(['reception_staff']),
  receptionController.confirmPayment
);

// --- GENERAL RECEPTION/COORDINATOR/ADMIN ROUTES ---
router.use(requireRole(['reception_staff', 'gh_coordinator', 'super_admin', 'guest_house_admin']));

router.get('/arrivals', receptionController.getTodayArrivals);
router.get('/rooms', receptionController.getRoomsWithStays);
router.get('/rooms/:roomNumber/history', receptionController.getRoomHistory);
router.post('/rooms/:roomNumber/status', receptionController.updateRoomStatus);

// Production safety stays endpoints — must be BEFORE /:id wildcard routes
router.post('/rooms/transfer', receptionController.roomTransfer);
router.post('/rooms/override', receptionController.overrideStayBilling);
router.get('/bookings/:bookingId/override-logs', receptionController.getBillingOverrideLogsByBooking);
router.post('/bookings/:bookingId/extend', receptionController.extendStay);

router.post('/stays/:stayId/check-out', receptionController.checkOutStay);

// --- NEW POS / BILLING & BULK ROOM ROUTES ---
router.get('/institution-config', receptionController.getInstitutionConfig);
router.post('/institution-config', receptionController.updateInstitutionConfig);
router.get('/pending-payments', receptionController.getPendingPayments);
router.get('/completed-payments', receptionController.getCompletedPayments);

router.get('/bulk-blocks', receptionController.getActiveBulkBlocks);
router.post('/bulk-blocks', receptionController.createBulkBlock);
router.post('/bulk-blocks/:bookingId/rooms/:roomId/check-in', receptionController.checkInBulkGuest);

// Wildcard routes LAST to avoid capturing /rooms/transfer etc.
router.post('/:id/assign-rooms', receptionController.assignRooms);
router.post('/:id/check-in', receptionController.checkIn);
router.post('/:id/check-out', receptionController.checkOut);
router.post('/guests/:guestId/check-in', receptionController.checkInGuest);
router.patch('/guests/:guestId', receptionController.updateGuestTimes);

module.exports = router;