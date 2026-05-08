const { sendError } = require('../utils/response');

module.exports = (err, req, res, next) => {
    console.error('[Global Error]:', err.message || err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Specifically target Zod Schema parsing errors
    if (err.name === 'ZodError') {
        return sendError(res, 'Validation Error', 400, err.errors);
    }

    return sendError(res, message, statusCode);
};