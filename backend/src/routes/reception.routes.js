const express = require('express');
const router = express.Router();

const receptionController = require('../controllers/reception.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/arrivals', receptionController.getTodayArrivals);
router.post('/:id/check-in', receptionController.checkIn);
router.post('/:id/check-out', receptionController.checkOut);

module.exports = router;