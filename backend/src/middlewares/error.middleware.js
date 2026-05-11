const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
    logger.error(err.message, { stack: err.stack, request: { method: req.method, url: req.originalUrl, body: req.body } });
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        data: null
    });
};