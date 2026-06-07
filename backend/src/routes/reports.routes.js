const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../utils/roles');

router.use(verifyToken);
router.use(checkRole([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR]));

router.get('/revenue', reportsController.getMonthlyRevenue);

module.exports = router;
