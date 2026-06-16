require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mailService = require('../src/services/mail.service');

async function test() {
    try {
        console.log("Testing email dispatch...");
        // Test sending with env-only configuration (like OTP)
        await mailService.sendEmail({
            to: 'test@example.com',
            subject: 'SMTP Notification Test',
            html: '<p>If you see this, email configuration works successfully!</p>',
            useEnvOnly: true
        });
        console.log("Test email dispatched successfully!");
    } catch (e) {
        console.error("Test email dispatch failed:", e.message);
    } finally {
        process.exit(0);
    }
}
test();
