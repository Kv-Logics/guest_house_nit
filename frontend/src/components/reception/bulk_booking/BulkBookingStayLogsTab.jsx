import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle, Loader2, Calendar, Building } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { receptionService } from '../../../services/reception.service';
import RoomMatrix from '../../dashboard/RoomMatrix';
import PricingLedger from '../PricingLedger';

export default function BulkBookingStayLogsTab({ booking, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [actionState, setActionState] = useState(null); // stayId that is currently loading
    const [allRooms, setAllRooms] = useState([]);
    const [tariffs, setTariffs] = useState([]);
    const [selectedMatrixRoomId, setSelectedMatrixRoomId] = useState(null);

    const translateRoomsFromBackend = (rooms) => {
        return (rooms || []).map(r => {
            let status = 'AVAILABLE';
            if (r.current_status === 'occupied') status = 'OCCUPIED';
            else if (r.current_status === 'double occupied') status = 'DOUBLE_OCCUPIED';
            else if (r.current_status === 'cleaning') status = 'CLEANING';
            else if (r.current_status === 'maintenance') status = 'MAINTENANCE';

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
                guests: [],
                activeBookingId: null,
                active_booking: r.active_booking,
                future_allocations: r.future_allocations || []
            };
        });
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
                console.error("Failed to fetch rooms/tariffs in stay logs tab", err);
            }
        };
        fetchRoomsAndTariffs();
    }, []);

    const isRoomFullForDates = (room, checkInDate, checkOutDate, currentGuestId) => {
        if (!checkInDate || !checkOutDate) return false;
        const start = new Date(checkInDate).getTime();
        const end = new Date(checkOutDate).getTime();

        const intervals = [];
        const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);

        (booking.guests || []).forEach(g => {
            if (g.guest_id === currentGuestId) return;
            const assignedRoom = g.allocated_room || (heldRoomNumbers[g.room_index] || '');
            
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

    const getMatrixRooms = () => {
        const heldRoomNumbers = (booking.allocated_room_numbers || '').split(',').map(rn => rn.trim()).filter(Boolean);
        const heldRooms = allRooms.filter(r => heldRoomNumbers.includes(String(r.roomId)));

        return heldRooms.map(r => {
            const roomGuests = (booking.guests || []).filter(g => {
                const guestRoomNumber = g.allocated_room || g.room_number || (g.room_index !== null && g.room_index !== undefined ? heldRoomNumbers[g.room_index] : '');
                return String(guestRoomNumber) === String(r.roomNumber);
            });

            const matrixGuests = roomGuests.map(g => ({
                guestId: g.stay_id || g.guest_id,
                name: g.guest_name,
                relation: g.relation_to_applicant,
                status: g.stay_status,
                actualCheckIn: g.checked_in_at,
                actualCheckOut: g.checked_out_at,
                rawCheckIn: g.arrival_datetime,
                rawCheckOut: g.departure_datetime
            }));

            const activeCount = matrixGuests.filter(g => g.status === 'CHECKED_IN').length;
            let displayStatus = 'AVAILABLE';
            if (activeCount >= 2) displayStatus = 'DOUBLE_OCCUPIED';
            else if (activeCount === 1) displayStatus = 'OCCUPIED';
            else if (r.status === 'CLEANING') displayStatus = 'CLEANING';
            else if (r.status === 'MAINTENANCE') displayStatus = 'MAINTENANCE';

            const otherAllocations = (r.future_allocations || []).filter(a => a.booking_id !== booking.booking_id);

            return {
                ...r,
                status: displayStatus,
                guests: matrixGuests,
                future_allocations: otherAllocations
            };
        });
    };

    const calculateRoomTimeline = (room) => {
        if (!room) return { timeline: [], totalBill: 0 };
        
        const romanMap = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4' };
        let categoryId = '1';
        if (booking.category_id) {
            categoryId = String(booking.category_id);
        } else if (booking.category_code) {
            const rawCat = booking.category_code.replace('CAT-', '').toUpperCase();
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

    const handleCheckInAll = async () => {
        if (!window.confirm("Check in all pending guests who have room assignments?")) return;
        
        const pendingWithRooms = booking.guests.filter(g => g.stay_status === 'PENDING' && (g.allocated_room || g.room_number));
        if (pendingWithRooms.length === 0) {
            alert("No pending guests with room assignments found.");
            return;
        }

        const assignments = pendingWithRooms.map(g => ({
            guestId: g.guest_id,
            roomNumber: g.allocated_room || g.room_number
        }));

        try {
            setLoading(true);
            await bulkBookingApi.checkInAll(booking.booking_id, assignments);
            if (onRefresh) await onRefresh();
            alert("All eligible guests checked in.");
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Check-in all failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOutAll = async () => {
        if (!window.confirm("Check out all currently active guests?")) return;
        try {
            setLoading(true);
            await bulkBookingApi.checkOutAll(booking.booking_id);
            if (onRefresh) await onRefresh();
            alert("All active guests checked out.");
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Check-out all failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckInGuest = async (stayId) => {
        if (!window.confirm("Check in this guest?")) return;
        try {
            setActionState(stayId);
            await bulkBookingApi.checkInGuest(booking.booking_id, stayId);
            if (onRefresh) await onRefresh();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Check-in failed');
        } finally {
            setActionState(null);
        }
    };

    const handleCheckOutGuest = async (stayId) => {
        if (!window.confirm("Check out this guest?")) return;
        try {
            setActionState(stayId);
            await bulkBookingApi.checkOutGuest(booking.booking_id, stayId, {});
            if (onRefresh) await onRefresh();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Check-out failed');
        } finally {
            setActionState(null);
        }
    };

    return (
        <div className="p-6 max-w-[80vw] mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Check-In / Check-Out Actions
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Manage guest stays dynamically without waiting for everyone</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleCheckInAll}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-xl transition-colors text-sm flex items-center gap-2 border border-emerald-200"
                    >
                        <LogIn className="w-4 h-4" /> Check In All Eligible
                    </button>
                    <button
                        onClick={handleCheckOutAll}
                        disabled={loading}
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl transition-colors text-sm flex items-center gap-2 border border-rose-200"
                    >
                        <LogOut className="w-4 h-4" /> Check Out All Active
                    </button>
                </div>
            </div>

            {/* Blocked Rooms Matrix & Roomwise Ledger */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" /> Blocked Rooms Matrix & Roomwise Ledger
                    </h3>
                </div>
                <div className="p-6 space-y-4">
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

                        const handleRoomClick = (roomId) => {
                            setSelectedMatrixRoomId(roomId);
                        };

                        const activeRoomIds = selectedMatrixRoomId ? [selectedMatrixRoomId] : [];

                        return (
                            <>
                                <RoomMatrix 
                                    rooms={getMatrixRooms()} 
                                    activeRoomIds={activeRoomIds} 
                                    onRoomClick={handleRoomClick} 
                                    title="Blocked Rooms for this Booking"
                                    showCategories={true}
                                />
                                {selectedMatrixRoomId && (
                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        {(() => {
                                             const selRoomObj = getMatrixRooms().find(r => r.roomId === selectedMatrixRoomId);
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
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-bold">
                            <th className="p-4">Guest</th>
                            <th className="p-4">Room</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Check In Time</th>
                            <th className="p-4">Check Out Time</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(booking.guests || []).map((guest) => {
                            const isPending = !guest.stay_status || guest.stay_status === 'PENDING';
                            const isActive = guest.stay_status === 'CHECKED_IN';
                            const isCompleted = guest.stay_status === 'CHECKED_OUT';
                            const heldRooms = (booking.allocated_room_numbers || '').split(',').map(r => r.trim()).filter(Boolean);
                            const guestRoomNumber = guest.allocated_room || guest.room_number || (guest.room_index !== null && guest.room_index !== undefined ? heldRooms[guest.room_index] : '');
                            const hasRoom = !!guestRoomNumber;

                            return (
                                <tr key={guest.guest_id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <p className="text-sm font-bold text-slate-800">{guest.guest_name}</p>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-700">
                                        {guestRoomNumber || 'TBD'}
                                    </td>
                                    <td className="p-4">
                                        {isActive ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">ACTIVE</span>
                                        ) : isCompleted ? (
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full">COMPLETED</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-full">PENDING</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {guest.checked_out_at ? new Date(guest.checked_out_at).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        {isPending && hasRoom && (
                                            <button
                                                onClick={() => handleCheckInGuest(guest.guest_id)}
                                                disabled={actionState === guest.guest_id}
                                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
                                            >
                                                {actionState === guest.guest_id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Check In'}
                                            </button>
                                        )}
                                        {isActive && (
                                            <button
                                                onClick={() => handleCheckOutGuest(guest.stay_id)}
                                                disabled={actionState === guest.stay_id}
                                                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
                                            >
                                                {actionState === guest.stay_id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Check Out'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
