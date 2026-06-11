export const translateArrivalsFromBackend = (arrivals) => {
    return (arrivals || []).map(b => {
        let guestsList = [];
        if (b.guests && Array.isArray(b.guests)) {
            guestsList = b.guests.map((g, idx) => ({
                guestId: g.guest_id || `G-${b.booking_id.split('-')[0].toUpperCase()}-${idx}`,
                name: g.guest_name,
                relation: g.relation_to_applicant,
                room_index: g.room_index !== null && g.room_index !== undefined ? g.room_index : 0,
                checkIn: new Date(b.arrival_datetime).toLocaleDateString(),
                checkOut: new Date(b.departure_datetime).toLocaleDateString()
            }));
        } else {
            guestsList = (b.guest_names || '').split(',').map((name, idx) => ({
                guestId: `G-${b.booking_id.split('-')[0].toUpperCase()}-${idx}`,
                name: name.trim(),
                relation: 'Guest',
                room_index: 0,
                checkIn: new Date(b.arrival_datetime).toLocaleDateString(),
                checkOut: new Date(b.departure_datetime).toLocaleDateString()
            })).filter(g => g.name);
        }

        const maxRoomIndex = guestsList.reduce((max, g) => Math.max(max, g.room_index), 0);
        const roomsCount = Math.max(b.rooms_required || 1, maxRoomIndex + 1);

        const rooms = [];
        for (let i = 0; i < roomsCount; i++) {
            rooms.push({
                roomId: `AppRoom-${b.booking_id.split('-')[0].toUpperCase()}-${i}`,
                roomIndex: i,
                roomType: b.room_type,
                guests: guestsList.filter(g => g.room_index === i)
            });
        }

        return {
            bookingId: b.booking_id,
            booking_id: b.booking_id,
            formatted_id: b.formatted_id || '',
            booking_seq: b.booking_seq,
            bookingSeq: b.booking_seq,
            applicant: b.applicant_name,
            category: b.category_id,
            bookingState: b.booking_state,
            booking_state: b.booking_state,
            bookingType: b.booking_type || '',
            booking_type: b.booking_type || '',
            allocatedRoomNumbers: b.allocated_room_numbers,
            rooms: rooms,
            rawGuests: (b.guests || []).map(g => ({
                ...g,
                arrival_datetime: g.arrival_datetime || b.arrival_datetime,
                departure_datetime: g.departure_datetime || b.departure_datetime
            })),
            rawCheckIn: b.arrival_datetime,
            rawCheckOut: b.departure_datetime,
            created_at: b.created_at
        };
    });
};

export const translateRoomsFromBackend = (rooms) => {
    return (rooms || []).map(r => {
        let status = 'AVAILABLE';
        if (r.current_status === 'occupied') status = 'OCCUPIED';
        else if (r.current_status === 'double occupied') status = 'DOUBLE_OCCUPIED';
        else if (r.current_status === 'cleaning') status = 'CLEANING';
        else if (r.current_status === 'maintenance') status = 'MAINTENANCE';

        const guests = [];
        let activeBookingId = null;
        if (r.active_booking) {
            activeBookingId = r.active_booking.booking_id;
            if (r.active_booking.guests) {
                r.active_booking.guests.forEach(g => {
                    guests.push({
                        guestId: g.stay_id, // Map stay_id to guestId for checkout calls
                        stay_id: g.stay_id,
                        guest_id: g.guest_id,
                        room_index: g.room_index,
                        bookingType: g.booking_type,
                        name: g.guest_name,
                        guest_name: g.guest_name,
                        relation: g.relation_to_applicant,
                        relation_to_applicant: g.relation_to_applicant,
                        checkIn: g.checked_in_at ? new Date(g.checked_in_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        checkOut: g.checked_out_at ? new Date(g.checked_out_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date(g.expected_departure || g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckIn: new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckOut: new Date(g.expected_departure || g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        actualCheckInStr: g.checked_in_at ? new Date(g.checked_in_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : null,
                        actualCheckOutStr: g.checked_out_at ? new Date(g.checked_out_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : null,
                        status: g.stay_status,
                        stay_status: g.stay_status,
                        actualCheckIn: g.checked_in_at,
                        actualCheckOut: g.checked_out_at,
                        rawCheckIn: g.arrival_datetime,
                        rawCheckOut: g.expected_departure || g.departure_datetime,
                        expected_departure: g.expected_departure,
                        operational_room_type: g.operational_room_type,
                        operational_tariff: g.operational_tariff,
                        extra_bed: g.extra_bed,
                        occupancy_type: g.occupancy_type,
                        food_preferences: g.food_preferences || [],
                        pendingExtension: g.pending_extension_datetime,
                        paymentState: g.payment_state,
                        paymentResponsible: g.payment_responsible,
                        categoryId: g.category_id,
                        operational_notes: g.operational_notes
                    });
                });
            }
        }

        if (r.pending_guests) {
            r.pending_guests.forEach(g => {
                    guests.push({
                        guestId: `pending-${g.guest_id}`,
                        guest_id: g.guest_id,
                        room_index: g.room_index,
                        booking_id: g.booking_id,
                        formatted_id: g.formatted_id,
                        booking_seq: g.booking_seq,
                        bookingType: g.booking_type,
                        name: g.guest_name,
                        guest_name: g.guest_name,
                        relation: g.relation,
                        relation_to_applicant: g.relation,
                        checkIn: new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        checkOut: new Date(g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckIn: new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckOut: new Date(g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        actualCheckInStr: null,
                        actualCheckOutStr: null,
                        status: 'PENDING',
                        stay_status: 'PENDING',
                        actualCheckIn: null,
                        actualCheckOut: null,
                        rawCheckIn: g.arrival_datetime,
                        rawCheckOut: g.departure_datetime,
                        expected_departure: g.expected_departure,
                        operational_room_type: null,
                        operational_tariff: null,
                        extra_bed: false,
                        occupancy_type: g.preferred_occupancy,
                        food_preferences: g.food_preferences || []
                    });
            });
        }

        return {
            floor: r.floor_number === 0 ? 'GROUND FLOOR' : 
                   r.floor_number === 1 ? 'FIRST FLOOR' : 
                   r.floor_number === 2 ? 'SECOND FLOOR' : 'THIRD FLOOR',
            roomId: r.room_number,
            room_id: r.room_id,
            roomNumber: r.room_number,
            roomType: r.room_type,
            capacity: r.capacity || 2,
            status: status,
            guests: guests,
            activeBookingId: activeBookingId,
            active_booking: r.active_booking,
            future_allocations: r.future_allocations || []
        };
    });
};
