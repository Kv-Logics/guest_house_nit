const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middlewares/error.middleware');
const { requestLogger } = require('./middlewares/logger.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { sanitizeInput } = require('./middlewares/sanitize.middleware');
const { generateCsrfToken, verifyCsrfToken } = require('./middlewares/csrf.middleware');
const routes = require('./routes/index');

const app = express();

app.use(requestLogger);

// Disable X-Powered-By header explicitly at application level
app.disable('x-powered-by');

// BREACH Mitigation: Disable HTTP compression for sensitive token & auth endpoints
app.use(compression({
    filter: (req, res) => {
        if (req.path === '/api/csrf-token' || req.path.includes('/auth/')) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Strict HTTP OPTIONS method sanitation to prevent OPTIONSBLEED and unauthorized scanning
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const hasOrigin = req.headers.origin;
        const hasAccessMethod = req.headers['access-control-request-method'];
        if (hasOrigin && hasAccessMethod) {
            // Allow CORS preflight requests
            return next();
        }
        // Block raw OPTIONS method scans
        res.setHeader('Allow', 'GET, POST, PUT, DELETE, PATCH');
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
    next();
});

// Custom response header stripping and permissions-policy injection
app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('x-nextjs-cache');
    res.removeHeader('x-nextjs-prerender');
    res.removeHeader('x-nextjs-stale-time');
    res.removeHeader('x-process-time');
    res.removeHeader('Server');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            frameAncestors: ["'none'"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(helmet.frameguard({ action: 'deny' })); // Clickjacking protection fallback for older browsers

// Support multiple allowed origins via comma-separated CORS_ORIGIN env var
// e.g. "http://rooms.nitt.edu:9006,https://rooms.nitt.edu,http://localhost:9006"
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, same-server requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(sanitizeInput);
app.use(generateCsrfToken);

app.get('/api/csrf-token', (req, res) => res.json({ success: true, token: req.csrfToken }));

// Expose uploads directory statically for document preview
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', apiLimiter);
app.use('/api', verifyCsrfToken);
app.use('/api', routes);

app.use(errorHandler);

module.exports = app;