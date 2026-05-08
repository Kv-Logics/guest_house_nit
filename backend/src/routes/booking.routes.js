const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/booking.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createBookingSchema } = require('../validators/booking.validator');

router.use(requireAuth); // Protect all booking routes at the router level

router.post('/', validate(createBookingSchema), bookingController.createBooking);
router.get('/my', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/cancel', bookingController.cancelBooking);

module.exports = router;