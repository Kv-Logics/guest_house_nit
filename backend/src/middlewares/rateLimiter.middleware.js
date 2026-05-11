const rateLimit = require('express-rate-limit');

exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Increased limit for easier development & testing
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
});