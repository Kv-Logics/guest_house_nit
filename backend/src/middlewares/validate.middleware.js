const { sendError } = require('../utils/response');

exports.validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        } catch (error) {
            // Format Zod Error Object strictly
            const formattedErrors = error.errors ? error.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : error;
            return sendError(res, 'Validation Error', 400, formattedErrors);
        }
    };
};