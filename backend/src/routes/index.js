const router = require('express').Router();

const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');
const approvalRoutes = require('./approval.routes');
const receptionRoutes = require('./reception.routes');

// Helper to safely mount routers even if they are exported incorrectly
// (e.g. module.exports = { router } instead of module.exports = router)
const safeMount = (routeModule) => {
    if (typeof routeModule === 'function') return routeModule; // Exported correctly
    if (routeModule && typeof routeModule.router === 'function') return routeModule.router; // Object export
    
    // Fallback dummy router to prevent app crash if export is missing completely
    const fallback = require('express').Router();
    fallback.use((req, res) => res.status(500).json({ 
        success: false, 
        message: 'Route module not exported correctly. Please verify module.exports in this route file.' 
    }));
    return fallback;
};

// Mount centralized routes
router.use('/auth', safeMount(authRoutes));
router.use('/bookings', safeMount(bookingRoutes));
router.use('/approvals', safeMount(approvalRoutes));
router.use('/reception', safeMount(receptionRoutes));

module.exports = router;