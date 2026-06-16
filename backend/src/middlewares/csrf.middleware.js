const crypto = require('crypto');

exports.generateCsrfToken = (req, res, next) => {
    let csrfToken = req.cookies['csrf-token'];
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf-token', csrfToken, {
            httpOnly: false, // Must be readable by frontend JS to attach to the header
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (Synched with auth session)
        });
    }
    req.csrfToken = csrfToken;
    next();
};

exports.verifyCsrfToken = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    
    const tokenFromCookie = req.cookies['csrf-token'];
    const tokenFromHeader = req.headers['x-csrf-token'];
    if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid or missing CSRF token' });
    }
    next();
};