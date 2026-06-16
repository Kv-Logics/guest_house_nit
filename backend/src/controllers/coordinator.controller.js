const fs = require('fs');
const path = require('path');
const coordinatorService = require('../services/coordinator.service');

// Logging helper to write to persistent log directory
const logToDebugFile = (message) => {
    try {
        const logDir = process.env.LOG_DIR_PATH || path.join(__dirname, '..', '..', 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFilePath = path.join(logDir, 'ghc-debug.log');
        fs.appendFileSync(logFilePath, `\n${message}`);
    } catch (e) {
        console.error('Failed to write to coordinator debug log:', e);
    }
};

const getBookingForOverride = async (req, res) => {
    try {
        const { bookingId } = req.params;
        logToDebugFile(`[GET /bookings/${bookingId}] req.user: ${JSON.stringify(req.user)}`);
        
        const booking = await coordinatorService.getBookingFullDetails(bookingId);
        if (!booking) {
            logToDebugFile(`-> 404 NOT FOUND`);
            return res.status(404).json({ error: 'Booking not found' });
        }
        logToDebugFile(`-> SUCCESS!`);
        res.json({ success: true, data: booking });
    } catch (err) {
        logToDebugFile(`-> ERROR: ${err.message}`);
        console.error('Coordinator getBooking error:', err);
        res.status(500).json({ error: 'Failed to fetch booking details', details: err.message });
    }
};

const getModifiableBookings = async (req, res) => {
    try {
        logToDebugFile(`[GET /bookings LIST] req.user: ${JSON.stringify(req.user)}`);
        const bookings = await coordinatorService.getModifiableBookings();
        logToDebugFile(`-> LIST SUCCESS, count: ${bookings.length}`);
        res.json({ success: true, data: bookings });
    } catch (err) {
        logToDebugFile(`-> LIST ERROR: ${err.message}`);
        console.error('Coordinator get bookings error:', err);
        res.status(500).json({ error: 'Failed to fetch modifiable bookings', details: err.message });
    }
};

const overrideBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const payload = req.body;
        const userId = req.user.user_id; // from authMiddleware

        const updatedBooking = await coordinatorService.processOverride(bookingId, payload, userId);
        res.json({ success: true, data: updatedBooking, message: 'Booking successfully updated' });
    } catch (err) {
        console.error('Coordinator override error:', err);
        res.status(500).json({ error: 'Failed to apply override', details: err.message });
    }
};

const generateFinalBill = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const payload = req.body; // { totalAmount, breakdownData }
        const userId = req.user.user_id;

        const result = await coordinatorService.generateFinalBillSnapshot(bookingId, payload, userId);
        res.json({ success: true, data: result, message: 'Final bill sent to Reception successfully' });
    } catch (err) {
        console.error('Coordinator generate bill error:', err);
        res.status(500).json({ error: 'Failed to generate final bill', details: err.message });
    }
};

const getAllTariffs = async (req, res) => {
    try {
        const tariffs = await coordinatorService.getAllTariffsWithCategories();
        res.json({ success: true, data: tariffs });
    } catch (err) {
        console.error('Coordinator get tariffs error:', err);
        res.status(500).json({ error: 'Failed to fetch tariffs', details: err.message });
    }
};

const updateTariff = async (req, res) => {
    try {
        const { tariffId } = req.params;
        const payload = req.body;
        const updatedTariff = await coordinatorService.updateTariff(tariffId, payload);
        res.json({ success: true, data: updatedTariff, message: 'Tariff successfully updated' });
    } catch (err) {
        console.error('Coordinator update tariff error:', err);
        res.status(500).json({ error: 'Failed to update tariff', details: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const users = await coordinatorService.getUsers(query);
        res.json({ success: true, data: users });
    } catch (err) {
        console.error('Coordinator getUsers error:', err);
        res.status(550).json({ error: 'Failed to fetch users', details: err.message });
    }
};

const createUser = async (req, res) => {
    try {
        const user = await coordinatorService.createUser(req.body);
        res.json({ success: true, data: user, message: 'User successfully created' });
    } catch (err) {
        console.error('Coordinator createUser error:', err);
        res.status(500).json({ error: 'Failed to create user', details: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await coordinatorService.updateUser(userId, req.body);
        res.json({ success: true, data: user, message: 'User successfully updated' });
    } catch (err) {
        console.error('Coordinator updateUser error:', err);
        res.status(500).json({ error: 'Failed to update user', details: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await coordinatorService.deleteUser(userId);
        res.json({ success: true, data: user, message: 'User successfully deleted' });
    } catch (err) {
        console.error('Coordinator deleteUser error:', err);
        res.status(550).json({ error: 'Failed to delete user', details: err.message });
    }
};

const getAllRoles = async (req, res) => {
    try {
        const roles = await coordinatorService.getAllRoles();
        res.json({ success: true, data: roles });
    } catch (err) {
        console.error('Coordinator getAllRoles error:', err);
        res.status(500).json({ error: 'Failed to fetch roles', details: err.message });
    }
};

const addRoom = async (req, res) => {
    try {
        const room = await coordinatorService.addRoom(req.body);
        res.json({ success: true, data: room, message: 'Room successfully added with tariffs' });
    } catch (err) {
        console.error('Coordinator addRoom error:', err);
        res.status(500).json({ error: 'Failed to add room', details: err.message });
    }
};

module.exports = {
    getBookingForOverride,
    getModifiableBookings,
    overrideBooking,
    generateFinalBill,
    getAllTariffs,
    updateTariff,
    addRoom,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAllRoles
};

