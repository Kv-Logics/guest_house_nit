const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const bookingController = require('../controllers/booking.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createBookingSchema } = require('../validators/booking.validator');
const db = require('../db/db');

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
router.patch('/:id/cancel', bookingController.cancelBooking);

router.patch('/:id/admin-status', async (req, res) => {
    const { status, remarks } = req.body;
    const { id } = req.params;
    try {
        const newState = status === 'APPROVED' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED';
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            const result = await client.query('UPDATE booking_requests SET booking_state = $1, updated_at = NOW() WHERE booking_id = $2 RETURNING *', [newState, id]);
            if (result.rows.length === 0) throw new Error('Booking not found');
            await client.query('INSERT INTO approval_logs (booking_id, approver_id, action, comments) VALUES ($1, $2, $3, $4)', [id, req.user.user_id, status, remarks || '']);
            await client.query('COMMIT');
            res.json({ success: true, data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/:id/reapply', upload.fields([{ name: 'document_1', maxCount: 1 }, { name: 'document_2', maxCount: 1 }]), async (req, res) => {
    if (req.body.payload) {
        try { req.body = JSON.parse(req.body.payload); } 
        catch (e) { return res.status(400).json({ success: false, message: 'Invalid JSON payload' }); }
    }
    try {
        const bookingService = require('../services/booking.service');
        req.body.user_id = req.user.user_id;
        req.body.files = req.files;
        req.body.booking_id = req.params.id;
        const result = await bookingService.reapplyBookingRequest(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/:id/history', async (req, res) => {
    try {
        const result = await db.query('SELECT a.*, u.full_name as approver_name FROM approval_logs a LEFT JOIN users u ON a.approver_id = u.user_id WHERE a.booking_id = $1 ORDER BY a.created_at DESC', [req.params.id]);
        res.json({ success: true, data: result.rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;