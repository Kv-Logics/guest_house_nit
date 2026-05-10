const express = require('express');
const router = express.Router();

const approvalController = require('../controllers/approval.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { approvalActionSchema } = require('../validators/approval.validator');

router.use(requireAuth);

router.get('/pending', approvalController.getPendingApprovals);
router.post('/:id', validate(approvalActionSchema), approvalController.approveBooking);

module.exports = router;