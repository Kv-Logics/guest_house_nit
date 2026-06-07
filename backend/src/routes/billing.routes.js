const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { ROLES } = require('../utils/constants');

// Billing oversight requires admin level privileges
router.use(requireAuth);
router.use(requireRole([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR]));

// Override a finalized bill
router.post('/:id/override', billingController.overrideBill);

// Get audit logs for billing overrides
router.get('/logs', billingController.getAuditLogs);

module.exports = router;
