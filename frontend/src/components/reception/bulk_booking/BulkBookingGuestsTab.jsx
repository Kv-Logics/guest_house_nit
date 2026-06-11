import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Loader2, Save, Users, Building, AlertTriangle, Calendar } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { receptionService } from '../../../services/reception.service';
import RoomMatrix from '../../dashboard/RoomMatrix';
import PricingLedger from '../PricingLedger';
import AddRoomsModal from './AddRoomsModal';
import { translateRoomsFromBackend } from '../../../utils/receptionUtils';

const toLocalDateString = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length === 10) {
        const [year, month, day] = dateInput.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    const d = new Date(dateInput);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const getLocalMidnight = (dateInput) => {
    return parseLocalDate(dateInput);
};

export default function BulkBookingGuestsTab({ booking, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [guestsInput, setGuestsInput] = useState('');
    const [roomAssignments, setRoomAssignments] = useState({});
    const [allRooms, setAllRooms] = useState([]);
    const [showMatrix, setShowMatrix] = useState(true);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [selectedMatrixRoomId, setSelectedMatrixRoomId] = useState(null);
    const [tariffs, setTariffs] = useState([]);
    const [showAddRoomsModal, setShowAddRoomsModal] = useState(false);
    
    const isDraft = booking.booking_state === 'DRAFT';
    const isApproved = booking.booking_state === 'ADMIN_APPROVED' || booking.booking_state === 'READY_FOR_CHECKIN';



    const calculateRoomTimeline = (room) => {
        if (!room) return { timeline: [], totalBill: 0 };
        
        const romanMap = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4' };
        let categoryId = '1';
        if (room.active_booking && room.active_booking.category_id) {
            categoryId = String(room.active_booking.category_id);
        } else if (room.active_booking && room.active_booking.category_code) {
            const rawCat = room.active_booking.category_code.replace('CAT-', '').toUpperCase();
            categoryId = romanMap[rawCat] || rawCat;
        }

        const roomType = room.roomType || "Standard Room";

        const getTariff = (catId, type, occ) => {
            const activeTariff = tariffs.find(t => String(t.category_id) === String(catId) && t.room_type === type) 
                || tariffs.find(t => String(t.category_id) === String(catId));
            
            if (activeTariff) {
                return occ === 'single' ? Number(activeTariff.single_occupancy) : Number(activeTariff.double_occupancy);
            }
            
            if (type === "Suite Room") return 5500;
            if (type === "Mini Suite Room") return 4000;
            
            const standardRates = {
                '1': { single: 1000, double: 1600 },
                '2': { single: 1100, double: 1800 },
                '3': { single: 1200, double: 2000 },
                '4': { single: 2600, double: 2600 }
            };
            const rates = standardRates[catId] || standardRates['1'];
            return occ === 'single' ? rates.single : rates.double;
        };

        const dateMap = {};
        const billedGuests = (room.guests || []).filter(g => g.status === 'CHECKED_IN' || g.status === 'CHECKED_OUT' || g.stay_status === 'CHECKED_IN' || g.stay_status === 'CHECKED_OUT');

        billedGuests.forEach(guest => {
            let start = new Date(guest.actualCheckIn || guest.rawCheckIn);
            let end = new Date(guest.actualCheckOut || guest.rawCheckOut);
            
            if (isNaN(start.getTime())) start = new Date();
            if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000);

            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            
            if (start >= end) {
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                end.setHours(0, 0, 0, 0);
            }

            const MAX_NIGHTS = 365;
            let nights = 0;

            while (start < end && nights < MAX_NIGHTS) {
                const year = start.getFullYear();
                const month = String(start.getMonth() + 1).padStart(2, '0');
                const day = String(start.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = { activeGuests: 0, guestNames: [] };
                }
                dateMap[dateStr].activeGuests += 1;
                dateMap[dateStr].guestNames.push(guest.name || guest.guest_name);
                start.setDate(start.getDate() + 1);
                nights++;
            }
        });

        const timeline = Object.keys(dateMap).sort().map(date => {
            const data = dateMap[date];
            const count = data.activeGuests;
            let occupancy = 'Single';
            let extraBeds = 0;
            let roomFare = 0;
            let extraBedCharge = 0;

            if (count === 1) {
                occupancy = 'Single';
                roomFare = getTariff(categoryId, roomType, 'single');
            } else if (count === 2) {
                occupancy = 'Double';
                roomFare = getTariff(categoryId, roomType, 'double');
            } else if (count > 2) {
                occupancy = 'Double';
                roomFare = getTariff(categoryId, roomType, 'double');
                extraBeds = count - 2;
                
                let extraBedRate = 400;
                const activeTariff = tariffs.find(t => String(t.category_id) === String(categoryId) && t.room_type === roomType) 
                    || tariffs.find(t => String(t.category_id) === String(categoryId));
                if (activeTariff && activeTariff.extra_bed !== undefined) {
                    extraBedRate = Number(activeTariff.extra_bed) || 400;
                }
                extraBedCharge = extraBeds * extraBedRate;
            }

            const dailyCharge = roomFare + extraBedCharge;

            return {
                date,
                activeGuests: count,
                guestNames: data.guestNames,
                occupancy,
                extraBeds,
                roomFare,
                extraBedCharge,
                dailyCharge
            };
        });

        const totalBill = timeline.reduce((sum, day) => sum + day.dailyCharge, 0);
        return { timeline, totalBill };
    };

    useEffect(() => {
        const fetchRoomsAndTariffs = async () => {
            try {
                const roomsRes = await receptionService.getRooms();
                if (roomsRes.success) {
                    setAllRooms(translateRoomsFromBackend(roomsRes.data || []));
                }
                const tariffsRes = await receptionService.getTariffs();
                if (tariffsRes.success) {
                    setTariffs(tariffsRes.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch rooms/tariffs in bulk guests tab", err);
            }
        };
        fetchRoomsAndTariffs();
    }, []);

    const isRoomAvailableForDates = (room, checkInDate, checkOutDate) => {
        if (!checkInDate || !checkOutDate) return true;
        const start = new Date(checkInDate).getTime();
        const end = new Date(checkOutDate).getTime();

        if (room.future_allocations && room.future_allocations.length > 0) {
            for (const alloc of room.future_allocations) {
                if (alloc.booking_id === booking.booking_id) continue;
                const allocStart = new Date(alloc.allocated_from).getTime();
                const allocEnd = new Date(alloc.allocated_to).getTime();
                if (start < allocEnd && end > allocStart) {
                    return false;
                }
            }
        }
        return true;
    };

    const isRoomFullForDates = (room, checkInDate, checkOutDate, currentGuestId) => {
        if (!checkInDate || !checkOutDate) return false;
        const start = new Date(checkInDate).getTime();
        const end = new Date(checkOutDate).getTime();

        const intervals = [];
        const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);

        (booking.guests || []).forEach(g => {
            if (g.guest_id === currentGuestId) return;
            const assignedRoom = roomAssignments[g.guest_id] !== undefined 
                ? roomAssignments[g.guest_id] 
                : (g.allocated_room || (heldRoomNumbers[g.room_index] || ''));
            
            if (assignedRoom !== room.roomNumber) return;

            const gStart = new Date(g.checked_in_at ? g.checked_in_at : (g.arrival_datetime || booking.arrival_datetime)).getTime();
            const gEnd = new Date(g.checked_out_at ? g.checked_out_at : (g.departure_datetime || booking.departure_datetime)).getTime();

            if (gStart < end && gEnd > start) {
                intervals.push({ start: gStart, end: gEnd });
            }
        });

        if (intervals.length === 0) return false;

        const events = [];
        intervals.forEach(inv => {
            events.push({ time: inv.start, type: 1 });
            events.push({ time: inv.end, type: -1 });
        });

        events.sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return a.type - b.type;
        });

        let active = 0;
        let maxActive = 0;
        for (const ev of events) {
            active += ev.type;
            if (active > maxActive) {
                maxActive = active;
            }
        }

        const maxCapacity = room.capacity ? (room.capacity + 1) : 3;
        return maxActive >= maxCapacity;
    };

    const handleAddGuestsBulk = async () => {
        const lines = guestsInput.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;

        const parsedGuests = lines.map(line => {
            const parts = line.split(',');
            return {
                guest_name: parts[0]?.trim() || 'Unknown',
                phone: parts[1]?.trim() || '',
                email: parts[2]?.trim() || '',
                relation_to_applicant: parts[3]?.trim() || 'Delegate',
                roll_number: '',
                identity_proof_number: parts[4]?.trim() || '',
                identity_proof_type: parts[4] ? 'ID Proof' : ''
            };
        });

        try {
            setLoading(true);
            await bulkBookingApi.addGuests(booking.booking_id, parsedGuests);
            setGuestsInput('');
            if (onRefresh) await onRefresh();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to add guests');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveGuest = async (guestId) => {
        if (!window.confirm("Remove this guest?")) return;
        try {
            setLoading(true);
            await bulkBookingApi.removeGuest(booking.booking_id, guestId);
            if (onRefresh) await onRefresh();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to remove guest');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRoomAssignments = async () => {
        const assignmentsToSave = Object.entries(roomAssignments).map(([guestId, roomNumber]) => ({
            guestId,
            roomNumber
        })).filter(a => a.roomNumber);

        if (assignmentsToSave.length === 0) {
            alert("No room assignments to save");
            return;
        }

        try {
            setLoading(true);
            await bulkBookingApi.allocateRooms(booking.booking_id, assignmentsToSave);
            setRoomAssignments({});
            if (onRefresh) await onRefresh();
            alert("Room assignments saved successfully.");
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to assign rooms');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSingleRoomAssignment = async (guestId, roomNumber) => {
        if (!roomNumber) {
            alert("Please select a room to assign.");
            return;
        }

        const guest = (booking.guests || []).find(g => g.guest_id === guestId);
        if (!guest) {
            alert("Guest not found.");
            return;
        }

        const targetRoom = allRooms.find(r => r.roomNumber === roomNumber);
        const maxCapacity = targetRoom ? (targetRoom.capacity + 1) : 3;

        const checkInDate = guest.checked_in_at ? new Date(guest.checked_in_at) : new Date(guest.arrival_datetime || booking.arrival_datetime);
        const checkOutDate = guest.checked_out_at ? new Date(guest.checked_out_at) : new Date(guest.departure_datetime || booking.departure_datetime);

        if (targetRoom && isRoomFullForDates(targetRoom, checkInDate.toISOString(), checkOutDate.toISOString(), guestId)) {
            alert(`Cannot assign guest. Room ${roomNumber} already has the maximum limit of ${maxCapacity} guests.`);
            return;
        }

        try {
            setLoading(true);
            await bulkBookingApi.allocateRooms(booking.booking_id, [{ guestId, roomNumber }]);
            setRoomAssignments(prev => {
                const copy = { ...prev };
                delete copy[guestId];
                return copy;
            });
            if (onRefresh) await onRefresh();
            alert(`Room ${roomNumber} assigned to guest successfully.`);
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to assign room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[80vw] mx-auto space-y-6">
            {/* Warning if draft */}
            {isDraft && (
                <div className="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <div>
                        <h4 className="font-bold text-sm">Draft Mode</h4>
                        <p className="text-xs mt-0.5">You can add guests now, but you cannot assign rooms until the booking is confirmed.</p>
                    </div>
                </div>
            )}

            {/* Bulk Add Box (Available before fully checked out) */}
            {booking.booking_state !== 'CHECKED_OUT' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Bulk Add Guests</h3>
                    <p className="text-xs text-slate-500 mb-3">
                        Enter one guest per line: <code>Name, Phone, Email, Role/Relation, ID Number</code>
                    </p>
                    <textarea
                        value={guestsInput}
                        onChange={(e) => setGuestsInput(e.target.value)}
                        placeholder="John Doe, 9876543210, john@example.com, Delegate, AADHAAR1234&#10;Jane Smith, 9876543211, jane@example.com, Speaker, PAN45678"
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono mb-4 resize-y"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleAddGuestsBulk}
                            disabled={loading || !guestsInput.trim()}
                            className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-sm hover:bg-slate-900 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Guests
                        </button>
                    </div>
                </div>
            )}

            {/* Room Availability Matrix (Visible if approved or checked in) */}
            {isApproved && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <button 
                            onClick={() => setShowMatrix(!showMatrix)}
                            className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
                        >
                            <h3 className="text-sm font-black text-slate-650 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" /> View Room Availability Matrix
                            </h3>
                            <span className="text-xs font-bold text-indigo-600">
                                {showMatrix ? 'Hide Matrix' : 'Show Matrix'}
                            </span>
                        </button>
                        {showMatrix && (
                            <div className="p-4 bg-slate-50/20 space-y-4">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => setShowAddRoomsModal(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add More Rooms
                                    </button>
                                </div>
                                {(() => {
                                    const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);
                                    const heldRooms = allRooms.filter(r => heldRoomNumbers.includes(String(r.roomId)));
                                    
                                    if (heldRoomNumbers.length === 0) {
                                        return (
                                            <div className="text-center py-6 text-slate-400 font-bold text-xs">
                                                No rooms have been blocked for this bulk booking yet.
                                            </div>
                                        );
                                    }

                                    const activeGuest = (booking.guests || []).find(g => g.guest_id === selectedGuestId);
                                    const activeCheckIn = activeGuest 
                                        ? (activeGuest.checked_in_at ? new Date(activeGuest.checked_in_at) : new Date(activeGuest.arrival_datetime || booking.arrival_datetime))
                                        : new Date(booking.arrival_datetime);
                                    const activeCheckOut = activeGuest 
                                        ? (activeGuest.checked_out_at ? new Date(activeGuest.checked_out_at) : new Date(activeGuest.departure_datetime || booking.departure_datetime))
                                        : new Date(booking.departure_datetime);

                                    const checkRoomAvailability = (room, checkIn, checkOut) => {
                                        if (!checkIn || !checkOut) return { available: true };
                                        const start = new Date(checkIn).getTime();
                                        const end = new Date(checkOut).getTime();

                                        if (room.future_allocations && room.future_allocations.length > 0) {
                                            for (const alloc of room.future_allocations) {
                                                if (alloc.booking_id === booking.booking_id) continue;
                                                const allocStart = new Date(alloc.allocated_from).getTime();
                                                const allocEnd = new Date(alloc.allocated_to).getTime();
                                                if (start < allocEnd && end > allocStart) {
                                                    return { available: false, isBulk: alloc.is_bulk };
                                                }
                                            }
                                        }
                                        return { available: true };
                                    };

                                     const getMatrixRooms = () => {
                                         return heldRooms.map(r => {
                                             const availStatus = checkRoomAvailability(r, activeCheckIn.toISOString(), activeCheckOut.toISOString());
                                             let displayStatus = 'AVAILABLE';
                                             let mockFutureAllocations = [];

                                             if (!availStatus.available) {
                                                 displayStatus = 'OCCUPIED';
                                                 if (availStatus.isBulk) {
                                                     mockFutureAllocations = [{
                                                         is_bulk: true,
                                                         allocated_from: new Date(Date.now() - 86400000).toISOString(),
                                                         allocated_to: new Date(Date.now() + 86400000).toISOString()
                                                     }];
                                                 }
                                             } else {
                                                 const isFull = isRoomFullForDates(r, activeCheckIn.toISOString(), activeCheckOut.toISOString(), selectedGuestId);
                                                 if (isFull) {
                                                     displayStatus = 'OCCUPIED';
                                                 } else if (r.status === 'CLEANING') {
                                                     displayStatus = 'CLEANING';
                                                 } else if (r.status === 'MAINTENANCE') {
                                                     displayStatus = 'MAINTENANCE';
                                                 }
                                             }

                                             return {
                                                 ...r,
                                                 status: displayStatus,
                                                 future_allocations: mockFutureAllocations
                                             };
                                         });
                                     };

                                    const handleRoomClick = (roomId) => {
                                        setSelectedMatrixRoomId(roomId);
                                        if (!selectedGuestId) {
                                            return;
                                        }
                                        
                                        const guest = (booking.guests || []).find(g => g.guest_id === selectedGuestId);
                                        if (!guest) return;
                                        if (guest.stay_status === 'CHECKED_IN' || guest.stay_status === 'CHECKED_OUT') {
                                            alert("Cannot change room assignment for checked-in or checked-out guests.");
                                            return;
                                        }

                                        setRoomAssignments(prev => ({
                                            ...prev,
                                            [selectedGuestId]: roomId
                                        }));
                                    };

                                    const activeRoomIds = Array.from(new Set([...Object.values(roomAssignments), selectedMatrixRoomId].filter(Boolean)));

                                    return (
                                        <>
                                            {selectedGuestId && (
                                                <div className="text-xs bg-indigo-50 text-indigo-700 p-3 rounded-xl font-bold border border-indigo-100 flex items-center justify-between">
                                                    <span>
                                                        Showing availability for selected guest: <span className="underline">{activeGuest?.guest_name}</span> ({activeCheckIn.toLocaleDateString()} to {activeCheckOut.toLocaleDateString()})
                                                    </span>
                                                    <button onClick={() => setSelectedGuestId(null)} className="text-[10px] bg-white border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">
                                                        Clear Selected Guest
                                                    </button>
                                                </div>
                                            )}
                                            <RoomMatrix 
                                                rooms={getMatrixRooms()} 
                                                activeRoomIds={activeRoomIds} 
                                                onRoomClick={handleRoomClick} 
                                                now={activeCheckIn}
                                                title="Blocked Rooms for this Booking"
                                                showCategories={true}
                                            />
                                            {selectedMatrixRoomId && (
                                                <div className="mt-4 border-t border-slate-100 pt-4">
                                                    {(() => {
                                                         const selRoomObj = allRooms.find(r => r.roomId === selectedMatrixRoomId);
                                                         if (!selRoomObj) return null;
                                                         
                                                         const catCodeMap = { '1': 'CAT-I', '2': 'CAT-II', '3': 'CAT-III', '4': 'CAT-IV' };
                                                         const categoryCode = booking.category_code || catCodeMap[String(booking.category_id)] || 'CAT-I';
                                                         selRoomObj.active_booking = {
                                                             ...(selRoomObj.active_booking || {}),
                                                             category_code: categoryCode
                                                         };

                                                         const { timeline, totalBill } = calculateRoomTimeline(selRoomObj);
                                                         return (
                                                             <PricingLedger 
                                                                 selectedRoom={selRoomObj} 
                                                                 timeline={timeline} 
                                                                 totalBill={totalBill} 
                                                             />
                                                         );
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Guest List & Assignments */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" /> Guest Roster ({booking.guests?.length || 0})
                    </h3>
                    {isApproved && Object.keys(roomAssignments).length > 0 && (
                        <button
                            onClick={handleSaveRoomAssignments}
                            disabled={loading}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                            <Save className="w-3.5 h-3.5" /> Save Room Assignments
                        </button>
                    )}
                </div>

                <div className="p-6 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(booking.guests || []).map((guest, idx) => {
                            const checkInDate = guest.checked_in_at ? new Date(guest.checked_in_at) : new Date(guest.arrival_datetime || booking.arrival_datetime);
                            const checkOutDate = guest.checked_out_at ? new Date(guest.checked_out_at) : new Date(guest.departure_datetime || booking.departure_datetime);
                            const durationMs = checkOutDate.getTime() - checkInDate.getTime();
                            const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
                            
                            const isCheckedIn = guest.stay_status === 'CHECKED_IN';
                            const isCheckedOut = guest.stay_status === 'CHECKED_OUT';
                            const isPending = !isCheckedIn && !isCheckedOut;

                             const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);

                            const isSelected = selectedGuestId === guest.guest_id;
                            
                            const bookingMinCheckIn = booking.arrival_datetime ? toLocalDateString(booking.arrival_datetime) : '';
                            const bookingMaxCheckOut = booking.departure_datetime ? toLocalDateString(booking.departure_datetime) : '';
                            const checkInMax = (() => { 
                                 const d = booking.departure_datetime ? new Date(booking.departure_datetime) : new Date(checkOutDate); 
                                 d.setDate(d.getDate() - 1); 
                                 return toLocalDateString(d); 
                             })();
                             const checkOutMin = (() => { 
                                 const d = new Date(checkInDate); 
                                 d.setDate(d.getDate() + 1); 
                                 return toLocalDateString(d); 
                             })();

                            return (
                                <div 
                                    key={guest.guest_id || idx} 
                                    onClick={() => setSelectedGuestId(guest.guest_id)}
                                    className={`bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all relative cursor-pointer ${
                                        isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/5' : 'border-slate-200'
                                    }`}
                                >
                                    {/* Sl No Badge */}
                                    <div className="absolute top-4 left-4 bg-slate-100 text-slate-655 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                                        #{idx + 1}
                                    </div>
                                    
                                    {/* Delete Button */}
                                    {isPending && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveGuest(guest.guest_id);
                                            }}
                                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Remove Guest"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="pl-8 space-y-4">
                                        {/* Guest Title */}
                                        <div>
                                            <h4 className="text-base font-extrabold text-slate-800">{guest.guest_name}</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{guest.relation_to_applicant || 'Guest'}</p>
                                        </div>

                                        {/* Guest Info Grid */}
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-0.5">Phone Number</span>
                                                <span className="text-slate-800 font-semibold">{guest.phone || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-0.5">ID Number</span>
                                                <span className="text-slate-800 font-semibold">{guest.identity_proof_number || guest.id_proof_number || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-0.5">Occupancy Status</span>
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider mt-0.5 ${
                                                    isCheckedIn ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    isCheckedOut ? 'bg-slate-105 text-slate-600 border-slate-200' :
                                                    'bg-orange-50 text-orange-700 border-orange-100'
                                                }`}>
                                                    {isCheckedIn ? 'Checked In' : isCheckedOut ? 'Checked Out' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dates & Duration */}
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-1">Check-In</span>
                                                {isCheckedIn || isCheckedOut ? (
                                                    <span className="text-slate-800 font-bold">{checkInDate.toLocaleDateString()}</span>
                                                ) : (
                                                    <input
                                                        type="date"
                                                        value={toLocalDateString(checkInDate)}
                                                        min={bookingMinCheckIn}
                                                        max={checkInMax}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={async (e) => {
                                                            const newDate = e.target.value;
                                                            if (!newDate) return;
                                                            const d1 = getLocalMidnight(newDate);
                                                            const d2 = getLocalMidnight(checkOutDate);
                                                            
                                                            let updatedCheckOut = d2;
                                                            const minCheckOut = new Date(d1);
                                                            minCheckOut.setDate(minCheckOut.getDate() + 1);
                                                            
                                                            if (d2 < minCheckOut) {
                                                                updatedCheckOut = minCheckOut;
                                                            }
                                                            
                                                            try {
                                                                setLoading(true);
                                                                await bulkBookingApi.updateGuest(booking.booking_id, guest.guest_id, {
                                                                    arrival_datetime: d1.toISOString(),
                                                                    departure_datetime: updatedCheckOut.toISOString()
                                                                 });
                                                                 if (onRefresh) await onRefresh();
                                                            } catch (err) {
                                                                alert(err.response?.data?.message || err.message || 'Failed to update check-in date');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-1">Check-Out</span>
                                                {isCheckedIn || isCheckedOut ? (
                                                    <span className="text-slate-800 font-bold">{checkOutDate.toLocaleDateString()}</span>
                                                ) : (
                                                    <input
                                                        type="date"
                                                        value={toLocalDateString(checkOutDate)}
                                                        min={checkOutMin}
                                                        max={bookingMaxCheckOut}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={async (e) => {
                                                            const newDate = e.target.value;
                                                            if (!newDate) return;
                                                            const d2 = getLocalMidnight(newDate);
                                                            const d1 = getLocalMidnight(checkInDate);
                                                            
                                                            let updatedCheckIn = d1;
                                                            let updatedCheckOut = d2;
                                                            
                                                            const maxCheckIn = new Date(d2);
                                                            maxCheckIn.setDate(maxCheckIn.getDate() - 1);
                                                            
                                                            const bookingStart = booking.arrival_datetime ? getLocalMidnight(booking.arrival_datetime) : null;
                                                            
                                                            if (d1 > maxCheckIn) {
                                                                if (bookingStart && maxCheckIn < bookingStart) {
                                                                    updatedCheckIn = bookingStart;
                                                                    const minCheckOut = new Date(bookingStart);
                                                                    minCheckOut.setDate(minCheckOut.getDate() + 1);
                                                                    updatedCheckOut = minCheckOut;
                                                                } else {
                                                                    updatedCheckIn = maxCheckIn;
                                                                }
                                                            }
                                                            
                                                            try {
                                                                setLoading(true);
                                                                await bulkBookingApi.updateGuest(booking.booking_id, guest.guest_id, {
                                                                    arrival_datetime: updatedCheckIn.toISOString(),
                                                                    departure_datetime: updatedCheckOut.toISOString()
                                                                });
                                                                if (onRefresh) await onRefresh();
                                                            } catch (err) {
                                                                alert(err.response?.data?.message || err.message || 'Failed to update check-out date');
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                                    />
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-slate-400 font-bold block mb-0.5">Duration of Stay</span>
                                                <span className="text-indigo-600 font-black text-sm">{durationDays} Nights ({durationDays} Days)</span>
                                            </div>
                                        </div>

                                         {/* Room Assignment */}
                                         <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                                             <div className="flex items-center justify-between gap-4">
                                                 <span className="text-xs text-slate-400 font-bold uppercase">Room Assignment</span>
                                                 <div className="flex-1 max-w-[180px] flex items-center gap-2">
                                                     {isCheckedIn || isCheckedOut ? (
                                                         <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                                                             <Building className="w-4 h-4 text-indigo-500" />
                                                             Room {guest.allocated_room || guest.room_number || 'TBD'}
                                                         </div>
                                                     ) : (
                                                         <>
                                                              <select
                                                                  disabled={!isApproved}
                                                                  value={roomAssignments[guest.guest_id] !== undefined ? roomAssignments[guest.guest_id] : (guest.allocated_room || (heldRoomNumbers[guest.room_index] || ''))}
                                                                  onClick={(e) => e.stopPropagation()}
                                                                  onChange={(e) => {
                                                                      const roomVal = e.target.value;
                                                                      
                                                                      if (roomVal) {
                                                                          const targetRoom = allRooms.find(r => r.roomNumber === roomVal);
                                                                          if (targetRoom && isRoomFullForDates(targetRoom, checkInDate.toISOString(), checkOutDate.toISOString(), guest.guest_id)) {
                                                                              const maxCapacity = targetRoom.capacity + 1;
                                                                              alert(`Cannot select Room ${roomVal}. It already has the maximum limit of ${maxCapacity} guests.`);
                                                                              return;
                                                                          }
                                                                      }
                                                                      setRoomAssignments(prev => ({ ...prev, [guest.guest_id]: roomVal }));
                                                                  }}
                                                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400 font-bold text-slate-800 bg-white"
                                                              >
                                                                  <option value="">Select Room...</option>
                                                                  {(() => {
                                                                      const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);
                                                                      return heldRoomNumbers.filter(rn => {
                                                                          const targetRoom = allRooms.find(r => r.roomNumber === rn);
                                                                          if (!targetRoom) return false;
                                                                          return !isRoomFullForDates(targetRoom, checkInDate.toISOString(), checkOutDate.toISOString(), guest.guest_id);
                                                                      }).map(rn => (
                                                                          <option key={rn} value={rn}>Room {rn}</option>
                                                                      ));
                                                                  })()}
                                                              </select>
                                                             {roomAssignments[guest.guest_id] !== undefined && roomAssignments[guest.guest_id] !== (guest.allocated_room || '') && (
                                                                 <button
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         handleSaveSingleRoomAssignment(guest.guest_id, roomAssignments[guest.guest_id]);
                                                                     }}
                                                                     disabled={loading}
                                                                     className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-colors"
                                                                 >
                                                                     Save
                                                                 </button>
                                                             )}
                                                         </>
                                                     )}
                                                 </div>
                                             </div>
                                             {(() => {
                                                 const assignedRoom = roomAssignments[guest.guest_id] !== undefined ? roomAssignments[guest.guest_id] : (guest.allocated_room || (heldRoomNumbers[guest.room_index] || ''));
                                                 if (!assignedRoom) return null;
                                                 
                                                 const checkInTime = checkInDate.getTime();
                                                 const checkOutTime = checkOutDate.getTime();

                                                 const sameRoomGuests = (booking.guests || []).filter(g => {
                                                     const r = roomAssignments[g.guest_id] !== undefined ? roomAssignments[g.guest_id] : (g.allocated_room || (heldRoomNumbers[g.room_index] || ''));
                                                     if (r !== assignedRoom) return false;
                                                     
                                                     const gStart = new Date(g.checked_in_at ? g.checked_in_at : (g.arrival_datetime || booking.arrival_datetime)).getTime();
                                                     const gEnd = new Date(g.checked_out_at ? g.checked_out_at : (g.departure_datetime || booking.departure_datetime)).getTime();
                                                     
                                                     return gStart < checkOutTime && gEnd > checkInTime;
                                                 });
                                                 const count = sameRoomGuests.length;
                                                 
                                                 return (
                                                     <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mt-1">
                                                         <span>Projected Occupancy:</span>
                                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                             count === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                             count === 2 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                             'bg-purple-50 text-purple-700 border border-purple-100'
                                                         }`}>
                                                             {count === 1 ? 'Single Occupancy' : count === 2 ? 'Double Occupancy' : 'Double + Extra Bed'}
                                                         </span>
                                                     </div>
                                                 );
                                             })()}
                                         </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!booking.guests || booking.guests.length === 0) && (
                            <div className="col-span-full py-12 text-center text-slate-450 font-bold">
                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                No guests added yet. Use the form above to add guests.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <AddRoomsModal 
                isOpen={showAddRoomsModal} 
                onClose={() => setShowAddRoomsModal(false)} 
                booking={booking}
                currentAllocatedRooms={(booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean)}
                onRoomsAdded={onRefresh}
            />
        </div>
    );
}
