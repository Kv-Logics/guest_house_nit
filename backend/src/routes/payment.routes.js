const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { verifyPaymentSchema, warningSchema } = require('../validators/payment.validator');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads/payments');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-proof-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB Limit

router.use(requireAuth);
router.post('/:id/proof', upload.single('payment_proof'), paymentController.uploadProof);
router.get('/:id/proofs', paymentController.getProofHistory);
router.post('/:id/verify', requireRole(['super_admin', 'guest_house_admin', 'gh_coordinator']), validate(verifyPaymentSchema), paymentController.verifyPayment);
router.post('/:id/warn', requireRole(['super_admin', 'guest_house_admin', 'gh_coordinator']), validate(warningSchema), paymentController.sendWarning);
router.post('/:id/pos-complete', requireRole(['super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff']), paymentController.posComplete);
router.post('/:id/pos-confirm', requireRole(['super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff']), paymentController.posConfirm);
module.exports = router;