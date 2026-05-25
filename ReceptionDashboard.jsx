import React, { useState, useEffect } from 'react';
import { Bed, UserPlus, LogOut, Receipt, Shield, Calendar, Users, DollarSign, Trash2, UserCheck, CheckCircle2 } from 'lucide-react';

// Default Pricing Configuration
const PRICING_CONFIG = {
    "Standard Room": { single: 2000, double: 3500, extraBed: 400 },
    "Suite Room": { single: 4000, double: 6500, extraBed: 400 },
    "Mini Suite": { single: 2500, double: 4000, extraBed: 400 },
    "Renovated Room": { single: 3000, double: 5000, extraBed: 400 }
};

// Initial Data matching your requested incoming format structure
const INITIAL_DB = {
    "category": "I",
    "arrivals": [
        {
            "bookingId": "B-1001",
            "applicant": "Dr. Sarah Jenkins",
            "category": "I",
            "rooms": [
                {
                    "roomId": "AppRoom1",
                    "roomType": "Standard Room",
                    "guests": [
                        {
                            "guestId": "G1",
                            "name": "Dr. Smith",
                            "checkIn": "2026-05-15T10:00:00Z",
                            "checkOut": "2026-05-20T12:00:00Z"
                        }
                    ]
                }
            ]
        }
    ],
    "rooms": [
        {
            "floor": "GROUND FLOOR",
            "roomId": "A1",
            "roomType": "Suite",
            "status": "OCCUPIED",
            "guests": [
                {
                    "guestId": "G1",
                    "name": "Dr. Smith",
                    "checkIn": "2026-05-15",
                    "checkOut": "2026-05-20",
                    "status": "CHECKED_IN"
                }
            ]
        },
        {
            "floor": "GROUND FLOOR",
            "roomId": "A2",
            "roomType": "Suite",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "GROUND FLOOR",
            "roomId": "B1",
            "roomType": "Mini Suite",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "11",
            "roomType": "Standard Room",
            "status": "OCCUPIED",
            "guests": [
                {
                    "guestId": "T1",
                    "name": "Test Guest One",
                    "checkIn": "2026-05-01",
                    "checkOut": "2026-05-05",
                    "status": "CHECKED_IN"
                },
                {
                    "guestId": "T2",
                    "name": "Test Guest Two",
                    "checkIn": "2026-05-03",
                    "checkOut": "2026-05-08",
                    "status": "CHECKED_IN"
                },
                {
                    "guestId": "T3",
                    "name": "Test Guest Three",
                    "checkIn": "2026-05-04",
                    "checkOut": "2026-05-06",
                    "status": "CHECKED_IN"
                }
            ]
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "12",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "13",
            "roomType": "Standard Room",
            "status": "CLEANING",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "14",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "15",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "16",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "17",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "18",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "19",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "FIRST FLOOR",
            "roomId": "20",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "21",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "22",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "23",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "24",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "25",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "26",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "27",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "28",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "29",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "30",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "SECOND FLOOR",
            "roomId": "B2",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "31",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "32",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "33",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "34",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "35",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "36",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "37",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "38",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "39",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "40",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "41",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "42",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "43",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "44",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "45",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "46",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "47",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "48",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "49",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "50",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "51",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "52",
            "roomType": "Standard Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "53",
            "roomType": "Renovated Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "54",
            "roomType": "Renovated Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "55",
            "roomType": "Renovated Room",
            "status": "AVAILABLE",
            "guests": []
        },
        {
            "floor": "THIRD FLOOR",
            "roomId": "56",
            "roomType": "Renovated Room",
            "status": "AVAILABLE",
            "guests": []
        }
    ]
};

export default function ReceptionDashboard() {
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [bookingData, setBookingData] = useState(() => {
        const saved = localStorage.getItem('reception_db_v8');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.arrivals) return INITIAL_DB; // Force reset if old format
                return parsed;
            } catch (e) {
                return INITIAL_DB;
            }
        }
        return INITIAL_DB;
    });

    const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' | 'rooms'
    const [activeRoomId, setActiveRoomId] = useState('Room 11');
    
    // Check-In Modal State
    const [previewArrival, setPreviewArrival] = useState(null);
    const [assignMode, setAssignMode] = useState(false);
    const [roomAssignments, setRoomAssignments] = useState({});
    
    // Custom Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Simulated System Date for testing
    const [systemDate, setSystemDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Sync to local mock database
    useEffect(() => {
        localStorage.setItem('reception_db_v8', JSON.stringify(bookingData));
    }, [bookingData]);

    // --- DYNAMIC OCCUPANCY & BILLING ENGINE ---
    const calculateRoomTimeline = (room) => {
        if (!room) return { timeline: [], totalBill: 0 };
        const pricing = PRICING_CONFIG[room.roomType] || PRICING_CONFIG["Standard Room"];
        const dateMap = {};

        // Only include guests who have actually checked in or out
        const billedGuests = room.guests.filter(g => g.status === 'CHECKED_IN' || g.status === 'CHECKED_OUT');

        // Map guests into active nights (inclusive checkIn, exclusive checkOut)
        billedGuests.forEach(guest => {
            let start = new Date(guest.actualCheckIn || guest.checkIn);
            let end = new Date(guest.actualCheckOut || guest.checkOut);
            
            // Ensure at least 1 night is billed if they check in and out on the same day
            if (start >= end) {
                end = new Date(start);
                end.setDate(end.getDate() + 1);
            }

            while (start < end) {
                const dateStr = start.toISOString().split('T')[0];
                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = { activeGuests: 0, guestNames: [] };
                }
                dateMap[dateStr].activeGuests += 1;
                dateMap[dateStr].guestNames.push(guest.name);
                start.setDate(start.getDate() + 1);
            }
        });

        // Sort dates chronologically and apply billing rules
        const timeline = Object.keys(dateMap).sort().map(date => {
            const data = dateMap[date];
            const count = data.activeGuests;
            let occupancy = 'Single';
            let extraBeds = 0;
            let roomFare = 0;
            let extraBedCharge = 0;

            if (count === 1) {
                occupancy = 'Single';
                roomFare = pricing.single;
            } else if (count === 2) {
                occupancy = 'Double';
                roomFare = pricing.double;
            } else if (count > 2) {
                occupancy = 'Double';
                roomFare = pricing.double;
                extraBeds = count - 2;
                extraBedCharge = extraBeds * pricing.extraBed;
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

    // --- CONTROLLER ACTIONS ---
    const handleUpdateGuestStatus = (roomId, guestId, status) => {
        setConfirmDialog({
            title: status === 'CHECKED_IN' ? 'Confirm Check-In' : 'Confirm Check-Out',
            message: `Are you sure you want to mark this guest as ${status === 'CHECKED_IN' ? 'Checked In' : 'Checked Out'}?`,
            isAlert: false,
            onConfirm: () => {
                const now = systemDate; // Use simulated system date
                const updatedRooms = (bookingData.rooms || []).map(room => {
                    if (room.roomId === roomId) {
                        return {
                            ...room,
                            guests: room.guests.map(g => {
                                if (g.guestId === guestId) {
                                    return { 
                                        ...g, 
                                        status,
                                        ...(status === 'CHECKED_IN' && !g.actualCheckIn ? { actualCheckIn: now } : {}),
                                        ...(status === 'CHECKED_OUT' && !g.actualCheckOut ? { actualCheckOut: now } : {})
                                    };
                                }
                                return g;
                            })
                        };
                    }
                    return room;
                });
                setBookingData({ ...bookingData, rooms: updatedRooms });
                setConfirmDialog(null);
            }
        });
    };

    const handleSendToCleaning = (roomId) => {
        setConfirmDialog({
            title: 'Vacate Room',
            message: 'Vacate this room completely and send to cleaning? All guest data will be archived.',
            isAlert: false,
            onConfirm: () => {
                const updatedRooms = (bookingData.rooms || []).map(room => {
                    if (room.roomId === roomId) {
                        return { ...room, guests: [], status: 'CLEANING' };
                    }
                    return room;
                });
                setBookingData({ ...bookingData, rooms: updatedRooms });
                setConfirmDialog(null);
            }
        });
    };

    const handleMarkAsCleaned = (roomId) => {
        const updatedRooms = (bookingData.rooms || []).map(room => {
            if (room.roomId === roomId) {
                return { ...room, status: 'AVAILABLE' };
            }
            return room;
        });
        setBookingData({ ...bookingData, rooms: updatedRooms });
    };

    const handleAssignRoom = () => {
        // Validate all logical rooms have been assigned a physical room
        for (let appRoom of previewArrival.rooms) {
            if (!roomAssignments[appRoom.roomId]) {
                setConfirmDialog({
                    title: 'Missing Assignment',
                    message: `Please assign a physical room for ${appRoom.roomId} (${appRoom.roomType}) before confirming.`,
                    isAlert: true,
                    onConfirm: () => setConfirmDialog(null)
                });
                return;
            }
        }
        
        let updatedRooms = [...(bookingData.rooms || [])];

        // Process each logical room in the application
        previewArrival.rooms.forEach(appRoom => {
            const physicalRoomId = roomAssignments[appRoom.roomId];
            updatedRooms = updatedRooms.map(room => {
                if (room.roomId === physicalRoomId) {
                    return {
                        ...room,
                        guests: [
                            ...(room.guests || []),
                            ...(appRoom.guests || []).map(g => ({ ...g, status: 'PENDING' }))
                        ],
                        status: 'OCCUPIED'
                    };
                }
                return room;
            });
        });

        // Remove arrival from arrivals list
        const updatedArrivals = (bookingData.arrivals || []).filter(a => a.bookingId !== previewArrival.bookingId);

        setBookingData({
            ...bookingData,
            rooms: updatedRooms,
            arrivals: updatedArrivals
        });

        // Reset states and jump to rooms tab
        setPreviewArrival(null);
        setAssignMode(false);
        setRoomAssignments({});
        setActiveRoomId(roomAssignments[previewArrival.rooms[0].roomId]);
        setActiveTab('rooms');
    };

    const availableRoomsList = (bookingData.rooms || []).filter(r => r.status === 'AVAILABLE');
    const bookedRoomsList = (bookingData.rooms || []).filter(r => r.status === 'OCCUPIED');
    const cleaningRoomsList = (bookingData.rooms || []).filter(r => r.status === 'CLEANING');
    const selectedRoom = (bookingData.rooms || []).find(r => r.roomId === activeRoomId) || (bookingData.rooms && bookingData.rooms[0]);
    const { timeline, totalBill } = calculateRoomTimeline(selectedRoom);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
            {/* Top Navigation Strip */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                        <Bed className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">FrontDesk Reception Engine</h1>
                        <p className="text-xs text-slate-500 font-medium">Category {bookingData.category} Properties • Dynamic Occupancy Pipeline</p>
                    </div>
                </div>

            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('arrivals')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'arrivals' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <UserCheck className="w-4 h-4" /> Arrivals ({(bookingData.arrivals || []).length})
                </button>
                <button
                    onClick={() => setActiveTab('rooms')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'rooms' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Bed className="w-4 h-4" /> Rooms Management
                </button>
            </div>

            <div className="max-w-7xl mx-auto">
                {activeTab === 'arrivals' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">Expected Arrivals</h2>
                        
                        {!(bookingData.arrivals && bookingData.arrivals.length > 0) ? (
                            <p className="text-slate-500 text-center py-8">No arrivals pending.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {bookingData.arrivals.map(arr => (
                                    <div key={arr.bookingId} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xs font-mono font-bold text-slate-400 block">{arr.bookingId}</span>
                                                <h3 className="font-bold text-lg text-slate-800">{arr.applicant}</h3>
                                            </div>
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Pending</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-4">
                                            {arr.rooms.reduce((acc, r) => acc + (r.guests || []).length, 0)} Guest(s) across {arr.rooms.length} Room(s)
                                        </p>
                                        <button 
                                            onClick={() => { setPreviewArrival(arr); setAssignMode(false); setRoomAssignments({}); }}
                                            className="w-full bg-slate-100 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            Preview & Assign
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="flex flex-col gap-6 w-full">
                        {/* TOP PANEL: Room Navigation Matrix */}
                        <div className="w-full">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                    <h2 className="text-md font-bold text-slate-800">Property Matrix ({bookingData.rooms?.length})</h2>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button onClick={() => setFilterCategory('ALL')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
                                    <button onClick={() => setFilterCategory('AVAILABLE')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Available ({availableRoomsList.length})</button>
                                    <button onClick={() => setFilterCategory('OCCUPIED')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'OCCUPIED' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>Booked ({bookedRoomsList.length})</button>
                                    <button onClick={() => setFilterCategory('CLEANING')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'CLEANING' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>Cleaning ({cleaningRoomsList.length})</button>
                                </div>
                                
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(bookingData.rooms || []).filter(r => filterCategory === 'ALL' ? true : r.status === filterCategory).map(room => {
                                        const isSelected = room.roomId === activeRoomId;
                                        let bgClass = "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400";
                                        if (room.status === 'AVAILABLE') bgClass = "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
                                        if (room.status === 'OCCUPIED') bgClass = "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100";
                                        if (room.status === 'CLEANING') bgClass = "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
                                        
                                        if (isSelected) {
                                            bgClass = "bg-slate-800 border-slate-800 text-white shadow-md transform scale-105 z-10";
                                        }

                                        return (
                                            <div
                                                key={room.roomId}
                                                onClick={() => setActiveRoomId(room.roomId)}
                                                className={`p-2 rounded-xl border cursor-pointer transition-all text-center flex flex-col items-center justify-center aspect-square ${bgClass}`}
                                                title={room.roomType}
                                            >
                                                <span className="font-bold text-sm tracking-tight">{room.roomId}</span>
                                                {room.roomType.includes('Suite') && (
                                                    <span className={`text-[7px] font-bold px-1 py-0.5 mt-0.5 rounded leading-none uppercase tracking-wider ${isSelected ? 'bg-slate-700 text-slate-200' : 'bg-black/10'}`}>
                                                        {room.roomType}
                                                    </span>
                                                )}
                                                <span className="text-[9px] opacity-80 mt-1 truncate w-full px-0.5 font-medium">{room.status === 'OCCUPIED' ? `${room.guests.length} Pax` : room.status}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM PANEL: Reception Operations & Dynamic Invoice Engine */}
                        <div className="w-full space-y-6">

                            {/* Section 1: Active Guests Status Board */}
                            {selectedRoom?.status === 'CLEANING' ? (
                                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30 text-center">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">Room is currently in Cleaning</h2>
                                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">This room was recently vacated and is being serviced by housekeeping. Mark it as clean to return it to the available pool.</p>
                                    <button 
                                        onClick={() => handleMarkAsCleaned(selectedRoom.roomId)}
                                        className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors shadow-md"
                                    >
                                        Mark as Cleaned & Available
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-500" /> Active Registry Details — {selectedRoom?.roomId}
                                    </h2>
                                </div>

                                {!selectedRoom || selectedRoom.guests.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-4 text-center">No guests allocated to this room currently.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                                                    <th className="p-3">Guest Name</th>
                                                    <th className="p-3">Check In Date</th>
                                                    <th className="p-3">Check Out Date</th>
                                                    <th className="p-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedRoom.guests.map(guest => (
                                                    <tr key={guest.guestId} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-semibold text-slate-800">{guest.name}</td>
                                                        <td className="p-3 text-slate-600 font-mono text-xs">{guest.checkIn}</td>
                                                        <td className="p-3 text-slate-600 font-mono text-xs">{guest.checkOut}</td>
                                                        <td className="p-3 text-right flex items-center justify-end gap-2">
                                                            {guest.status !== 'CHECKED_IN' && guest.status !== 'CHECKED_OUT' && (
                                                                <button
                                                                    onClick={() => handleUpdateGuestStatus(selectedRoom.roomId, guest.guestId, 'CHECKED_IN')}
                                                                    className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-1 border border-teal-200 rounded hover:bg-teal-100 uppercase tracking-wide transition-colors shadow-sm"
                                                                >
                                                                    Check In
                                                                </button>
                                                            )}
                                                            {guest.status === 'CHECKED_IN' && (
                                                                <button
                                                                    onClick={() => handleUpdateGuestStatus(selectedRoom.roomId, guest.guestId, 'CHECKED_OUT')}
                                                                    className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 border border-amber-200 rounded hover:bg-amber-100 uppercase tracking-wide transition-colors shadow-sm"
                                                                >
                                                                    Check Out
                                                                </button>
                                                            )}
                                                            {guest.status === 'CHECKED_OUT' && (
                                                                <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-1 rounded bg-slate-50 uppercase tracking-wide">Checked Out</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end">
                                            <button 
                                                onClick={() => handleSendToCleaning(selectedRoom.roomId)}
                                                className="bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" /> Vacate Room & Send to Cleaning
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Section 2: Real-time Live Audited Dynamic Billing Ledger */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-indigo-500" /> Pricing Calculation & Daily Overlap Timeline
                                    </h2>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold text-slate-400 block">Total Operational Invoice</span>
                                        <span className="text-xl font-extrabold text-indigo-600 font-mono">₹{totalBill}</span>
                                    </div>
                                </div>

                                {timeline.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-6 text-center">No calculations available. Insert guest bounds above to fire pricing engines.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Dynamic Invoice Metadata */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Property Category</span>
                                                <span className="font-bold text-slate-700 text-sm">Category {bookingData.category}</span>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Room Classification</span>
                                                <span className="font-bold text-slate-700 text-sm">{selectedRoom?.roomType}</span>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Billed Nights</span>
                                                <span className="font-bold text-slate-700 text-sm">{timeline.length} Nights</span>
                                            </div>
                                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Total Amount</span>
                                                <span className="font-bold text-indigo-700 text-sm">₹{totalBill}</span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Active Guests</th>
                                                        <th className="p-3">Occupancy Framework</th>
                                                        <th className="p-3">Extra Beds</th>
                                                        <th className="p-3">Daily Base</th>
                                                        <th className="p-3">Extra Charge</th>
                                                        <th className="p-3 text-right">Total Charge</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-medium">
                                                    {timeline.map((day, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="p-3 font-mono font-bold text-slate-800">{day.date}</td>
                                                            <td className="p-3 text-xs text-slate-600 font-medium max-w-[120px] truncate" title={day.guestNames.join(', ')}>
                                                                {day.guestNames.join(', ')}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${day.activeGuests > 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                    day.activeGuests === 2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                    {day.occupancy} ({day.activeGuests} Pax)
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-600 font-mono font-bold">{day.extraBeds}</td>
                                                            <td className="p-3 text-slate-500 font-mono">₹{day.roomFare}</td>
                                                            <td className="p-3 text-slate-500 font-mono">₹{day.extraBedCharge}</td>
                                                            <td className="p-3 text-right font-mono font-bold text-slate-900">₹{day.dailyCharge}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEW & ASSIGN MODAL */}
            {previewArrival && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
                        <div className="bg-indigo-600 p-6 text-white">
                            <h2 className="text-2xl font-bold mb-1">Preview Arrival</h2>
                            <p className="text-indigo-200 text-sm">{previewArrival.bookingId} - {previewArrival.applicant}</p>
                        </div>
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Application Manifest</h3>
                            <div className="space-y-4 mb-6">
                                {previewArrival.rooms.map(appRoom => (
                                    <div key={appRoom.roomId} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                            <div>
                                                <span className="font-bold text-slate-800">{appRoom.roomId}</span>
                                                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{appRoom.roomType}</span>
                                            </div>
                                            {assignMode && (
                                                <select 
                                                    value={roomAssignments[appRoom.roomId] || ''}
                                                    onChange={e => setRoomAssignments({...roomAssignments, [appRoom.roomId]: e.target.value})}
                                                    className="p-1.5 text-xs rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                                >
                                                    <option value="">-- Assign Physical Room --</option>
                                                    {availableRoomsList.filter(r => r.roomType === appRoom.roomType || !appRoom.roomType).map(r => (
                                                        <option key={r.roomId} value={r.roomId}>{r.roomId} ({r.roomType})</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {appRoom.guests.map(g => (
                                                <div key={g.guestId} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                                                    <span className="font-bold text-xs text-slate-700">{g.name}</span>
                                                    <div className="text-[10px] font-mono text-slate-500">
                                                        {g.checkIn} <span className="text-slate-300 mx-1">→</span> {g.checkOut}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!assignMode ? (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setPreviewArrival(null)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => setAssignMode(true)}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        Map & Assign Rooms
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-2">
                                    <h3 className="text-sm font-bold text-indigo-800 mb-4">Complete Room Assignments</h3>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setAssignMode(false)}
                                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={handleAssignRoom}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            Confirm Assignments
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM IN-APP CONFIRMATION DIALOG */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in p-6 text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">{confirmDialog.title}</h2>
                        <p className="text-slate-600 text-sm mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3 justify-center">
                            {!confirmDialog.isAlert && (
                                <button 
                                    onClick={() => setConfirmDialog(null)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {confirmDialog.isAlert ? 'OK' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}