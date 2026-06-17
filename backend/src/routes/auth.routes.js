const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { requestOtpSchema, verifyOtpSchema, setupPasswordSchema, loginSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

// Auth Endpoints
router.post('/request-otp', authLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/check-status', authLimiter, validate(requestOtpSchema), authController.checkUserStatus);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/setup-password', authLimiter, validate(setupPasswordSchema), authController.setupPassword);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getProfile);
router.post('/refresh', authController.refresh);

module.exports = router;