const express = require('express');
const router = express.Router();

const approvalController = require('../controllers/approval.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { approvalActionSchema } = require('../validators/approval.validator');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.use(requireRole(['director', 'registrar', 'dean', 'hod', 'faculty', 'staff']));

router.get('/pending', approvalController.getPendingApprovals);
router.get('/history', approvalController.getApprovalHistory);
router.post('/:id', validate(approvalActionSchema), approvalController.approveBooking);

module.exports = router;