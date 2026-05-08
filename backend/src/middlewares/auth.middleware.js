const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

exports.requireAuth = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return sendError(res, 'Unauthorized access. Token missing.', 401);
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET || 'nitt_gh_secret_key');
        next();
    } catch (error) {
        return sendError(res, 'Invalid or expired token.', 401);
    }
};