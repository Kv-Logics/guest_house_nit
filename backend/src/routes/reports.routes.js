const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

router.use(requireAuth);
router.use(requireRole([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR]));

router.get('/revenue', reportsController.getMonthlyRevenue);

module.exports = router;
