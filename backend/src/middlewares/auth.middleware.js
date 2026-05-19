const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');
const authRepository = require('../repositories/auth.repository');

exports.requireAuth = async (req, res, next) => {
    try {
        console.log(`[AUTH MIDDLEWARE] Request path: ${req.path}`);
        console.log(`[AUTH MIDDLEWARE] Cookies received:`, req.cookies);
        
        let token = req.cookies?.accessToken || req.cookies?.token;
        console.log(`[AUTH MIDDLEWARE] Token extracted:`, token ? `${token.substring(0, 15)}...` : 'undefined');
        
        if (!token) {
            console.warn(`[AUTH MIDDLEWARE] Verification failed: token cookie is missing`);
            return sendError(res, 'Unauthorized access. Secure cookie token missing.', 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Bridge Central SSO user representation with Guest House local database user
        if (decoded.email) {
            const localUser = await authRepository.findUserByEmail(decoded.email);
            if (!localUser) {
                console.error(`[AUTH MIDDLEWARE] Local user matching email ${decoded.email} not found in database.`);
                return sendError(res, 'User record not found in local system.', 404);
            }
            req.user = {
                ...decoded,
                id: localUser.user_id,
                user_id: localUser.user_id,
                role: localUser.role
            };
        } else {
            req.user = decoded;
            if (decoded.id && !decoded.user_id) req.user.user_id = decoded.id;
        }

        console.log(`[AUTH MIDDLEWARE] Verification succeeded. Active User:`, req.user);
        next();
    } catch (error) {
        console.error(`[AUTH MIDDLEWARE] Verification failed with error:`, error.message);
        return sendError(res, 'Invalid or expired token.', 401);
    }
};