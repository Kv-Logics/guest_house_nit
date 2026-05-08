const { sendError } = require('../utils/response');

exports.requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return sendError(res, 'Forbidden: Insufficient role privileges', 403);
        }
        next();
    };
};

exports.requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        // Extensible for future permission-based scoping
        const permissions = req.user.permissions || [];
        if (!permissions.includes(requiredPermission)) {
            return sendError(res, 'Forbidden: Missing required permission', 403);
        }
        next();
    };
};