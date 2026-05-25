require('dotenv').config({ path: 'c:/Users/keert/GuestHouse/guesthouse/backend/.env' });
const { getRoomsWithStays, updateRoomStatus, extendStay } = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/services/reception.service');
const db = require('c:/Users/keert/GuestHouse/guesthouse/backend/src/db/db');

async function testReceptionRooms() {
    try {
        console.log('--- Starting Reception Rooms & Stays Service Test ---');

        // 1. Test getRoomsWithStays
        console.log('Fetching rooms with stays...');
        const rooms = await getRoomsWithStays();
        console.log(`Retrieved ${rooms.length} rooms.`);
        
        // Assertions/Checks
        const occupiedRooms = rooms.filter(r => r.current_status === 'occupied');
        console.log(`Found ${occupiedRooms.length} occupied rooms.`);
        for (const room of occupiedRooms) {
            console.log(`Room ${room.room_number}: active booking ${room.active_booking ? 'present ✅' : 'missing ❌'}`);
            if (room.active_booking) {
                console.log(` - Booking ID: ${room.active_booking.booking_id}`);
                console.log(` - Applicant: ${room.active_booking.applicant_name}`);
                console.log(` - Guests: ${room.active_booking.guests.map(g => `${g.guest_name} (${g.relation})`).join(', ')}`);
            }
        }

        const cleaningRooms = rooms.filter(r => r.current_status === 'cleaning');
        console.log(`Found ${cleaningRooms.length} rooms in cleaning.`);
        for (const room of cleaningRooms) {
            console.log(`Room ${room.room_number} is in cleaning status ✅`);
        }

        // 2. Test updateRoomStatus
        const targetRoomNumber = '31';
        console.log(`Updating Room ${targetRoomNumber} to available...`);
        const updatedRoom = await updateRoomStatus(targetRoomNumber, 'available');
        console.log(`Updated Room status: ${updatedRoom.current_status}`);
        if (updatedRoom.current_status === 'available') {
            console.log('✅ SUCCESS: Room status updated to available!');
        } else {
            console.error('❌ FAILURE: Room status not updated correctly.');
        }

        // Revert status back to cleaning
        await updateRoomStatus(targetRoomNumber, 'cleaning');
        console.log(`Reverted Room ${targetRoomNumber} status back to cleaning.`);

        // 3. Test extendStay
        if (occupiedRooms.length > 0 && occupiedRooms[0].active_booking) {
            const activeBooking = occupiedRooms[0].active_booking;
            const newDeparture = new Date(new Date(activeBooking.departure_datetime).getTime() + 86400000); // add 1 day
            console.log(`Extending stay for booking ${activeBooking.booking_id} until ${newDeparture.toISOString()}...`);
            const extendedBooking = await extendStay(activeBooking.booking_id, newDeparture);
            console.log(`New booking departure time: ${extendedBooking.departure_datetime}`);
            console.log('✅ SUCCESS: Booking stay extended!');

            // Revert back to original
            await extendStay(activeBooking.booking_id, activeBooking.departure_datetime);
            console.log('Reverted booking departure time back to original.');
        }

    } catch (err) {
        console.error('❌ Test failed with error:', err);
    } finally {
        db.pool.end();
        console.log('--- Test Finished ---');
    }
}

testReceptionRooms();
