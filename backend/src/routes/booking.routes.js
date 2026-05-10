const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const bookingController = require('../controllers/booking.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createBookingSchema } = require('../validators/booking.validator');

// Configure Multer for secure document uploads
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

router.use(requireAuth); // Protect all booking routes at the router level

router.get('/tariffs', bookingController.getTariffs);
router.get('/authorities', bookingController.getAuthorities);
router.get('/admin/all', bookingController.getAllBookingsForAdmin);

// Handle multipart/form-data properly, parse JSON payload, then validate
router.post('/', upload.fields([{ name: 'document_1', maxCount: 1 }, { name: 'document_2', maxCount: 1 }]), (req, res, next) => {
    if (req.body.payload) {
        try { req.body = JSON.parse(req.body.payload); } 
        catch (e) { return res.status(400).json({ success: false, message: 'Invalid JSON payload' }); }
    }
    next();
}, validate(createBookingSchema), bookingController.createBooking);

router.get('/my', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/pay', bookingController.mockPayment);
router.patch('/:id/admin-status', bookingController.updateAdminStatus);
router.patch('/:id/cancel', bookingController.cancelBooking);

module.exports = router;