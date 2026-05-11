const express = require('express');
const router = express.Router();

const receptionController = require('../controllers/reception.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.use(requireRole(['reception_staff', 'super_admin', 'guest_house_admin']));

router.get('/arrivals', receptionController.getTodayArrivals);
router.post('/:id/check-in', receptionController.checkIn);
router.post('/:id/check-out', receptionController.checkOut);

module.exports = router;