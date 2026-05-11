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

app.use(compression());

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
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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