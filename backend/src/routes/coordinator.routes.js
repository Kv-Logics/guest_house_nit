const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinator.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// Protect all routes: must be logged in, and must be either GH_COORDINATOR, ADMIN, SUPER_ADMIN, or GUEST_HOUSE_ADMIN
router.use(requireAuth);
router.use(requireRole(['gh_coordinator', 'admin', 'guest_house_admin']));

// Fetch a specific booking by ID (full details for override UI)
router.get('/bookings/:bookingId', coordinatorController.getBookingForOverride);

// Fetch all active/modifiable bookings (CHECKED_IN, PENDING_ADMIN, READY_FOR_CHECKIN)
router.get('/bookings', coordinatorController.getModifiableBookings);

// Submit massive override
router.put('/bookings/:bookingId/override', coordinatorController.overrideBooking);

// Generate final bill snapshot and lock it for Reception
router.post('/bookings/:bookingId/generate-bill', coordinatorController.generateFinalBill);

// Tariff Management
router.get('/tariffs', coordinatorController.getAllTariffs);
router.put('/tariffs/:tariffId', coordinatorController.updateTariff);
router.post('/rooms', coordinatorController.addRoom);

// User Management CRUD
router.get('/users', coordinatorController.getUsers);
router.post('/users', coordinatorController.createUser);
router.put('/users/:userId', coordinatorController.updateUser);
router.delete('/users/:userId', coordinatorController.deleteUser);
router.get('/roles', coordinatorController.getAllRoles);

module.exports = router;

