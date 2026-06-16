const nodemailer = require('nodemailer');
const db = require('../db/db');
const logger = require('../utils/logger');
// Note: env vars are injected by Docker Compose via env_file — no dotenv needed here

/**
 * Resolves SMTP settings: first queries the database system_settings table,
 * then falls back to environment variables.
 * If useEnvOnly is true, database lookup is skipped entirely (for OTP reliability).
 */
async function resolveSMTPSettings(useEnvOnly = false) {
    let settings = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
        secure: process.env.SMTP_SECURE === 'ssl' // SSL uses port 465 and secure: true
    };

    if (!useEnvOnly) {
        try {
            const res = await db.query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE \'smtp_%\'');
            const dbSettings = {};
            res.rows.forEach(row => {
                dbSettings[row.setting_key] = row.setting_value;
            });

            if (dbSettings.smtp_host) settings.host = dbSettings.smtp_host;
            if (dbSettings.smtp_port) settings.port = parseInt(dbSettings.smtp_port);
            if (dbSettings.smtp_username) settings.user = dbSettings.smtp_username;
            if (dbSettings.smtp_password) settings.pass = dbSettings.smtp_password;
            if (dbSettings.smtp_secure) settings.secure = dbSettings.smtp_secure === 'ssl';
        } catch (err) {
            logger.warn('Failed to fetch SMTP settings from system_settings, falling back to environment variables.', err);
        }
    }

    if (!settings.host || !settings.user || !settings.pass) {
        throw new Error('SMTP connection configurations (host, username, password) are missing or incomplete.');
    }

    return settings;
}

/**
 * Sends a generic system email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback body
 * @param {boolean} [options.useEnvOnly=false] - If true, relies strictly on environment variables
 */
exports.sendEmail = async ({ to, subject, html, text, useEnvOnly = false }) => {
    try {
        const smtp = await resolveSMTPSettings(useEnvOnly);
        
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure, // true for port 465 (ssl), false for 587 (tls)
            auth: {
                user: smtp.user,
                pass: smtp.pass
            },
            tls: {
                ciphers: 'SSLv3',
                // Do not fail on invalid certs
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"NITT Guest House Admin" <${smtp.user}>`,
            to,
            subject,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip tags for fallback
            html
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`[MAIL DISPATCH] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
        return info;
    } catch (err) {
        logger.error(`[MAIL FAILURE] Failed to dispatch email to ${to}: ${err.message}`, err);
        throw err;
    }
};
