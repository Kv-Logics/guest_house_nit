const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db');
const bookingService = require('./bookingService');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const app = express();

// --- MOCK REDIS FOR LOCAL DEVELOPMENT ---
const mockRedisCache = new Map();
const redisClient = {
    setEx: async (key, seconds, value) => {
        mockRedisCache.set(key, value);
        setTimeout(() => mockRedisCache.delete(key), seconds * 1000);
    },
    get: async (key) => mockRedisCache.get(key),
    del: async (key) => mockRedisCache.delete(key)
};
// ----------------------------------------

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Forbidden' });
        req.user = user;
        next();
    });
};

// API Endpoint to submit a new booking application
app.post('/api/bookings', authenticateToken, async (req, res) => {
    try {
        // Enforce user identity strictly from the secure token to prevent spoofing
        req.body.user_id = req.user.user_id;
        const result = await bookingService.submitBookingRequest(req.body);
        
        res.status(201).json({
            success: true,
            message: "Booking request submitted successfully.",
            data: result
        });
    } catch (error) {
        console.error('\n❌ Booking Submission Error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// API Endpoint to fetch bookings created by the logged-in user
app.get('/api/bookings/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.booking_id, b.booking_state, b.payment_state, b.approval_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.total_estimated_amount, b.created_at
            FROM booking_requests b
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `, [req.user.user_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Endpoint to delete a pending booking
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        let result;
        // Admins can delete any booking, normal users can only delete their own PENDING ones
        if (['super_admin', 'guest_house_admin'].includes(req.user.role) || req.user.email === 'admin@nitt.edu') {
            result = await db.query("DELETE FROM booking_requests WHERE booking_id = $1 RETURNING *", [id]);
        } else {
            result = await db.query(
                "DELETE FROM booking_requests WHERE booking_id = $1 AND user_id = $2 AND booking_state = 'PENDING_APPROVAL' RETURNING *",
                [id, req.user.user_id]
            );
        }
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found or cannot be deleted.' });
        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Endpoint to fetch all bookings for Admin Dashboard
app.get('/api/admin/bookings', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.booking_id, b.booking_state, b.payment_state, b.approval_state, b.arrival_datetime, b.departure_datetime, b.rooms_required, b.created_at,
                   b.purpose_of_visit, b.visit_type, b.project_code, b.payment_responsible, b.category_id, b.room_type, b.extra_beds, b.total_estimated_amount,
                   u.full_name as applicant_name, u.role as applicant_role, u.department, u.email as applicant_email,
                   (SELECT category_code FROM category_rules c WHERE c.category_id = b.category_id) as category_code,
                   (
                       SELECT json_agg(
                           row_to_json(g)::jsonb || jsonb_build_object(
                               'food_preferences', (
                                   SELECT json_agg(row_to_json(fp))
                                   FROM guest_food_preferences fp WHERE fp.guest_id = g.guest_id
                               )
                           )
                       )
                       FROM guests g WHERE g.booking_id = b.booking_id
                   ) as guests
            FROM booking_requests b
            JOIN users u ON b.user_id = u.user_id
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Endpoint to fetch room tariffs for frontend payment calculation
app.get('/api/tariffs', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM room_tariff');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Endpoint to mock payment
app.post('/api/bookings/:id/pay', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            "UPDATE booking_requests SET booking_state = 'CONFIRMED', payment_state = 'PAID' WHERE booking_id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Endpoint to approve/reject a booking
app.put('/api/admin/bookings/:id/status', authenticateToken, async (req, res) => {
    const { status, stage } = req.body;
    const { id } = req.params;
    try {
        const result = await db.query(
            'UPDATE booking_requests SET booking_state = $1, approval_state = $2, approved_at = NOW() WHERE booking_id = $3 RETURNING *',
            [status, stage, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 1. Request OTP Endpoint
app.post('/api/auth/request-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Email not found or inactive in the NITT system.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redisClient.setEx(`otp:${email}`, 120, otp); // 120 seconds = 2 mins expiry

        // MOCK EMAIL SENDING: Log to console
        console.log(`\n=========================================`);
        console.log(`📧 OTP for ${email} is: ${otp}`);
        console.log(`=========================================\n`);

        res.json({ success: true, message: 'OTP sent successfully to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error generating OTP' });
    }
});

// 2. Verify OTP Endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const storedOtp = await redisClient.get(`otp:${email}`);
        if (!storedOtp || storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        await redisClient.del(`otp:${email}`); // Clear OTP after use

        const result = await db.query('SELECT user_id, full_name, email, role, department, designation, employee_id FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role },
            JWT_SECRET, { expiresIn: '24h' }
        );
        
        res.json({ success: true, token, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`NITT Guest House Server running on port ${PORT} (Accessible on network)`);
});