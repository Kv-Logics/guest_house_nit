const router = require('express').Router();

const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');
const approvalRoutes = require('./approval.routes');
const paymentRoutes = require('./payment.routes');
const receptionRoutes = require('./reception.routes');
const coordinatorRoutes = require('./coordinator.routes');

// Helper to safely mount routers and prevent application crashes
const safeMount = (path, routeModule) => {
    // If exported correctly: `module.exports = router;`
    if (typeof routeModule === 'function') { 
        router.use(path, routeModule);
    } 
    // If mistakenly exported as an object: `module.exports = { router };`
    else if (routeModule && typeof routeModule.router === 'function') {
        router.use(path, routeModule.router);
    } 
    // If empty/missing, provide a dummy router to prevent Node.js from crashing
    else {
        const fallback = require('express').Router();
        fallback.use((req, res) => res.status(501).json({ error: `Route for ${path} is currently unavailable or missing its export.` }));
        router.use(path, fallback);
    }
};

// Mount centralized routes
safeMount('/auth', authRoutes);
safeMount('/bookings', bookingRoutes);
safeMount('/approvals', approvalRoutes);
safeMount('/payments', paymentRoutes);
safeMount('/reception', receptionRoutes);
safeMount('/coordinator', coordinatorRoutes);

module.exports = router;