const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

exports.requireAuth = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        
        if (!token) {
            return sendError(res, 'Unauthorized access. Secure cookie token missing.', 401);
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return sendError(res, 'Invalid or expired token.', 401);
    }
};