const express = require('express');
const router = express.Router({ mergeParams: true }); // Important to get :id from parent
const bulkBookingService = require('../services/bulkBookingService');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { sendSuccess } = require('../utils/response');

// Roles allowed to manage bulk stay records (GHC, Reception, Admin)
const bulkBookingRoles = ['reception_staff', 'guest_house_admin', 'gh_coordinator'];

router.use(requireAuth);

// Get all stay records for a bulk booking
router.get('/', async (req, res, next) => {
    try {
        const result = await bulkBookingService.getStayRecords(req.params.id);
        return sendSuccess(res, 'Stay records retrieved successfully', result);
    } catch (error) {
        next(error);
    }
});

// Add a new stay record
router.post('/', async (req, res, next) => {
    try {
        const result = await bulkBookingService.addStayRecord(req.params.id, req.body, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Stay record added successfully', result, 201);
    } catch (error) {
        next(error);
    }
});

// Update a stay record
router.put('/:recordId', async (req, res, next) => {
    try {
        const result = await bulkBookingService.updateStayRecord(req.params.id, req.params.recordId, req.body, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Stay record updated successfully', result);
    } catch (error) {
        next(error);
    }
});

// Delete a stay record
router.delete('/:recordId', async (req, res, next) => {
    try {
        const result = await bulkBookingService.deleteStayRecord(req.params.id, req.params.recordId, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Stay record deleted successfully', result);
    } catch (error) {
        next(error);
    }
});

// Create/Update Bill Groups
router.post('/bill-groups', requireRole(bulkBookingRoles), async (req, res, next) => {
    try {
        const result = await bulkBookingService.saveBillGroups(req.params.id, req.body.groups, req.body.recordAssignments, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Bill groups saved successfully', result);
    } catch (error) {
        next(error);
    }
});

// Lock and Generate Bills (GHC only usually, but we check logic in service)
router.post('/lock', requireRole(bulkBookingRoles), async (req, res, next) => {
    try {
        const result = await bulkBookingService.lockStayRecords(req.params.id, req.user.user_id || req.user.id);
        return sendSuccess(res, 'Stay records locked and bills generated successfully', result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
