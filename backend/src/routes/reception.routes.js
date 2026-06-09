const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const receptionController = require('../controllers/reception.controller');
const invoiceController = require('../billing/invoice.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads/documents');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

// --- INVOICE DOWNLOAD (Admin, Coordinator, Receptionist, User) ---
router.get(
  '/billing/invoice/:bookingId',
  invoiceController.downloadInvoice
);

// --- CONFIRM DESK SETTLEMENT (RECEPTIONIST ONLY) ---
router.post(
  '/bookings/:bookingId/confirm-payment',
  requireRole(['reception_staff']),
  upload.single('payment_proof'),
  (req, res, next) => {
      if (req.body.payload) {
          try { req.body = { ...req.body, ...JSON.parse(req.body.payload) }; } 
          catch (e) { return res.status(400).json({ success: false, message: 'Invalid JSON payload' }); }
      }
      next();
  },
  receptionController.confirmPayment
);

// --- SYSTEM SETTINGS (All Authenticated Users) ---
router.get('/institution-config', receptionController.getInstitutionConfig);

// --- GENERAL RECEPTION/COORDINATOR/ADMIN ROUTES ---
router.use(requireRole(['reception_staff', 'gh_coordinator', 'super_admin', 'guest_house_admin']));

router.get('/arrivals', receptionController.getTodayArrivals);
router.get('/rooms', receptionController.getRoomsWithStays);
router.get('/occupancy', receptionController.getOccupancyStats);
router.get('/rooms/:roomNumber/history', receptionController.getRoomHistory);
router.post('/rooms/:roomNumber/status', receptionController.updateRoomStatus);

// Production safety stays endpoints — must be BEFORE /:id wildcard routes
router.post('/rooms/transfer', receptionController.roomTransfer);
router.post('/rooms/override', receptionController.overrideStayBilling);
router.get('/bookings/:bookingId/override-logs', receptionController.getBillingOverrideLogsByBooking);
router.post('/bookings/:bookingId/extend', receptionController.extendStay);
router.get('/bookings/:bookingId/preview-bill', receptionController.previewBill);

router.get('/extensions/pending-allocation', receptionController.getPendingExtensionAllocations);
router.post('/extensions/allocate', receptionController.allocateExtensionRoom);
router.post('/operations/transfer-room', receptionController.executeRoomTransfer);

router.post('/stays/:stayId/check-out', receptionController.checkOutStay);

// --- NEW POS / BILLING & BULK ROOM ROUTES ---
router.post('/institution-config', receptionController.updateInstitutionConfig);
router.get('/pending-payments', receptionController.getPendingPayments);
router.get('/completed-payments', receptionController.getCompletedPayments);
router.get('/decode-qr', receptionController.decodeQrCode);

router.post(
  '/bookings/:bookingId/update-bill',

  requireRole(['gh_coordinator', 'super_admin', 'guest_house_admin']),
  receptionController.updateBill
);

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