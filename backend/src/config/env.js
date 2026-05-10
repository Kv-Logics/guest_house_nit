require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET || 'nitt_gh_secret_key',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    DB_URL: process.env.DATABASE_URL
};