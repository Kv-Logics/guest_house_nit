const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { ROLES } = require('../utils/roles');

// Billing oversight requires admin level privileges
router.use(verifyToken);
router.use(checkRole([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR]));

// Override a finalized bill
router.post('/:id/override', billingController.overrideBill);

// Get audit logs for billing overrides
router.get('/logs', billingController.getAuditLogs);

module.exports = router;
