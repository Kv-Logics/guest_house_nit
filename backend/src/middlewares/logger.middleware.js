const logger = require('../utils/logger');

exports.requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
        // Only attach body on errors to reduce noise in normal operation
        const meta = res.statusCode >= 400 ? { body: req.body } : undefined;
        logger.info(message, meta);
    });
    next();
};