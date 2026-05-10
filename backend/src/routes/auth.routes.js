const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { requestOtpSchema, verifyOtpSchema } = require('../validators/auth.validator');

// Auth Endpoints
router.post('/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getProfile);
router.post('/refresh', authController.refresh);

module.exports = router;