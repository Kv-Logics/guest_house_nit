const coordinatorService = require('../services/coordinator.service');

const getBookingForOverride = async (req, res) => {
    try {
        const { bookingId } = req.params;
        require('fs').appendFileSync('ghc-debug.log', `\n[GET /bookings/${bookingId}] req.user: ${JSON.stringify(req.user)}`);
        
        const booking = await coordinatorService.getBookingFullDetails(bookingId);
        if (!booking) {
            require('fs').appendFileSync('ghc-debug.log', `\n-> 404 NOT FOUND`);
            return res.status(404).json({ error: 'Booking not found' });
        }
        require('fs').appendFileSync('ghc-debug.log', `\n-> SUCCESS!`);
        res.json({ success: true, data: booking });
    } catch (err) {
        require('fs').appendFileSync('ghc-debug.log', `\n-> ERROR: ${err.message}`);
        console.error('Coordinator getBooking error:', err);
        res.status(500).json({ error: 'Failed to fetch booking details', details: err.message });
    }
};

const getModifiableBookings = async (req, res) => {
    try {
        require('fs').appendFileSync('ghc-debug.log', `\n[GET /bookings LIST] req.user: ${JSON.stringify(req.user)}`);
        const bookings = await coordinatorService.getModifiableBookings();
        require('fs').appendFileSync('ghc-debug.log', `\n-> LIST SUCCESS, count: ${bookings.length}`);
        res.json({ success: true, data: bookings });
    } catch (err) {
        require('fs').appendFileSync('ghc-debug.log', `\n-> LIST ERROR: ${err.message}`);
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

module.exports = {
    getBookingForOverride,
    getModifiableBookings,
    overrideBooking,
    generateFinalBill
};
