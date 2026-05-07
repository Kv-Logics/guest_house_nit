const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bookingService = require('./bookingService');

const app = express();

app.use(cors());
app.use(express.json());

// API Endpoint to submit a new booking application
app.post('/api/bookings', async (req, res) => {
    try {
        const result = await bookingService.submitBookingRequest(req.body);
        
        res.status(201).json({
            success: true,
            message: "Booking request submitted successfully.",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`NITT Guest House Server running on port ${PORT}`);
});