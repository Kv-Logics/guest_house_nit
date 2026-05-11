const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    // Neutralize script injections while preserving normal punctuation for React
    return unsafe.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

const sanitizeObject = (obj) => {
    if (obj === null || typeof obj === 'undefined') return obj;
    if (typeof obj === 'string') return escapeHtml(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
};

exports.sanitizeInput = (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
};