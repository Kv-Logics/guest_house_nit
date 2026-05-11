const logger = require('../utils/logger');

exports.requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
        const meta = {
            body: req.body,
            headers: req.headers,
        };
        logger.info(message, meta);
    });
    next();
};