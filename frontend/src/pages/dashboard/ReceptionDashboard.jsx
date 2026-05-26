import React, { useState, useEffect } from 'react';
import { Bed, UserPlus, LogOut, Receipt, Shield, Calendar, Users, DollarSign, Trash2, UserCheck, CheckCircle2, Sliders, Clock, ArrowLeftRight, ChevronDown, ChevronUp, X, Utensils, Activity, CheckCircle, XCircle, ArrowRight, Home, Settings, FileText, User, Bell, Search, Filter, HelpCircle, Loader2, Save, Printer, CreditCard, Plus, QrCode } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import RoomMatrix from '../../components/dashboard/RoomMatrix';
import GSTInvoiceModal from '../../pages/booking/GSTInvoiceModal';
import QRScannerModal from '../../components/ui/QRScannerModal';

// Default Pricing Configuration
const PRICING_CONFIG = {
    "Standard Room": { single: 2000, double: 3500, extraBed: 400 },
    "Suite Room": { single: 4000, double: 6500, extraBed: 400 },
    "Mini Suite Room": { single: 2500, double: 4000, extraBed: 400 },
    "Renovated Room": { single: 3000, double: 5000, extraBed: 400 }
};

// Translation adapters: Maps snake_case backend rows into the exact camelCase structure expected by the UI.
const translateArrivalsFromBackend = (arrivals) => {
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
            applicant: b.applicant_name,
            category: b.category_id,
            bookingState: b.booking_state,
            allocatedRoomNumbers: b.allocated_room_numbers,
            rooms: rooms,
            rawGuests: (b.guests || []).map(g => ({
                ...g,
                arrival_datetime: g.arrival_datetime || b.arrival_datetime,
                departure_datetime: g.departure_datetime || b.departure_datetime
            })),
            rawCheckIn: b.arrival_datetime,
            rawCheckOut: b.departure_datetime
        };
    });
};

const translateRoomsFromBackend = (rooms) => {
    return (rooms || []).map(r => {
        let status = 'AVAILABLE';
        if (r.current_status === 'occupied') status = 'OCCUPIED';
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
                        name: g.guest_name,
                        guest_name: g.guest_name,
                        relation: g.relation_to_applicant,
                        relation_to_applicant: g.relation_to_applicant,
                        checkIn: g.checked_in_at ? new Date(g.checked_in_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        checkOut: g.checked_out_at ? new Date(g.checked_out_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date(g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckIn: new Date(g.arrival_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        appliedCheckOut: new Date(g.departure_datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                        actualCheckInStr: g.checked_in_at ? new Date(g.checked_in_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : null,
                        actualCheckOutStr: g.checked_out_at ? new Date(g.checked_out_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : null,
                        status: g.stay_status,
                        stay_status: g.stay_status,
                        actualCheckIn: g.checked_in_at,
                        actualCheckOut: g.checked_out_at,
                        rawCheckIn: g.arrival_datetime,
                        rawCheckOut: g.departure_datetime,
                        operational_room_type: g.operational_room_type,
                        operational_tariff: g.operational_tariff,
                        extra_bed: g.extra_bed,
                        occupancy_type: g.occupancy_type,
                        food_preferences: g.food_preferences || []
                    });
                });
            }
        }

        if (r.pending_guests) {
            r.pending_guests.forEach(g => {
                guests.push({
                    guestId: `pending-${g.guest_id}`,
                    guest_id: g.guest_id,
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
            roomType: r.room_type,
            status: status,
            guests: guests,
            activeBookingId: activeBookingId,
            active_booking: r.active_booking,
            future_allocations: r.future_allocations || []
        };
    });
};

export default function ReceptionDashboard() {
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [bookingData, setBookingData] = useState({ category: 'I', arrivals: [], rooms: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' | 'rooms' | 'food'
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [foodFilterDate, setFoodFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    
    // Check-In Modal State
    const [previewArrival, setPreviewArrival] = useState(null);
    const [assignMode, setAssignMode] = useState(false);
    const [roomAssignments, setRoomAssignments] = useState({});
    
    // Custom Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Room Transfer Modal state
    const [transferModal, setTransferModal] = useState({
        isOpen: false,
        stayId: null,
        guestName: '',
        currentRoomNumber: '',
        newRoomNumber: '',
        remarks: '',
        isGroup: false
    });
    const [expandedArrivals, setExpandedArrivals] = useState({});


    // Time machine clock mock state
    const [isMockActive, setIsMockActive] = useState(localStorage.getItem('mock-system-date-active') === 'true');
    const [mockDateStr, setMockDateStr] = useState(localStorage.getItem('mock-system-date') || '');
    const [now, setNow] = useState(new Date());

    // Invoice Modal state
    const [invoiceBookingId, setInvoiceBookingId] = useState(null);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

    // Load data from backend API
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const arrivalsRes = await receptionService.getTodayArrivals();
            const roomsRes = await receptionService.getRooms();

            const translatedArrivals = translateArrivalsFromBackend(arrivalsRes.data);
            const translatedRooms = translateRoomsFromBackend(roomsRes.data);

            setBookingData({
                category: "I",
                arrivals: translatedArrivals,
                rooms: translatedRooms
            });

            // Set initial active room if not set
            if (translatedRooms.length > 0 && !activeRoomId) {
                setActiveRoomId(translatedRooms[0].roomId);
            }
        } catch (err) {
            console.error("Error fetching reception details:", err);
            setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Time machine clock mock synchronization
    useEffect(() => {
        if (isMockActive && mockDateStr) {
            setNow(new Date(mockDateStr));
        } else {
            setNow(new Date());
        }
    }, [isMockActive, mockDateStr]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!isMockActive) {
                setNow(new Date());
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [isMockActive]);

    const handleToggleMock = (e) => {
        const active = e.target.checked;
        setIsMockActive(active);
        localStorage.setItem('mock-system-date-active', String(active));
        if (active && !mockDateStr) {
            const currentLocal = new Date().toISOString().slice(0, 16);
            setMockDateStr(currentLocal);
            localStorage.setItem('mock-system-date', currentLocal);
        } else if (!active) {
            localStorage.removeItem('mock-system-date');
            localStorage.removeItem('mock-system-date-active');
        }
        loadDashboardData();
    };

    const handleMockDateChange = (e) => {
        const val = e.target.value;
        setMockDateStr(val);
        if (isMockActive) {
            localStorage.setItem('mock-system-date', val);
        }
        loadDashboardData();
    };

    const handleResetMock = () => {
        setIsMockActive(false);
        setMockDateStr('');
        localStorage.removeItem('mock-system-date-active');
        localStorage.removeItem('mock-system-date');
        loadDashboardData();
    };

    // --- DYNAMIC OCCUPANCY & BILLING ENGINE ---
    const calculateRoomTimeline = (room) => {
        if (!room) return { timeline: [], totalBill: 0 };
        
        let category = 'I';
        if (room.active_booking && room.active_booking.category_id) {
            category = room.active_booking.category_id;
        } else if (room.active_booking && room.active_booking.category_code) {
            category = room.active_booking.category_code.replace('CAT-', '');
        }

        const roomType = room.roomType || "Standard Room";

        const getTariff = (cat, type, occ) => {
            if (type === "Suite Room") return 5500;
            if (type === "Mini Suite Room") return 4000;
            
            const standardRates = {
                '1': { single: 1000, double: 1600 },
                'I': { single: 1000, double: 1600 },
                '2': { single: 1100, double: 1800 },
                'II': { single: 1100, double: 1800 },
                '3': { single: 1200, double: 2000 },
                'III': { single: 1200, double: 2000 },
                '4': { single: 2600, double: 2600 },
                'IV': { single: 2600, double: 2600 }
            };

            const rates = standardRates[cat] || standardRates['I'];
            return occ === 'single' ? rates.single : rates.double;
        };

        const dateMap = {};

        // Only include guests who have actually checked in or out
        const billedGuests = room.guests.filter(g => g.status === 'CHECKED_IN' || g.status === 'CHECKED_OUT');

        // Map guests into active nights
        billedGuests.forEach(guest => {
            let start = new Date(guest.actualCheckIn || guest.rawCheckIn);
            let end = new Date(guest.actualCheckOut || guest.rawCheckOut);
            
            // Ensure at least 1 night is billed if check-in/out timestamps are too close
            if (start >= end) {
                end = new Date(start);
                end.setDate(end.getDate() + 1);
            }

            if (guest.status === 'CHECKED_IN') {
                const currentDate = new Date();
                if (currentDate > end) {
                    end = currentDate;
                }
            }

            if (isNaN(start.getTime())) start = new Date();
            if (isNaN(end.getTime())) end = new Date(start.getTime() + 86400000);

            const MAX_NIGHTS = 365;
            let nights = 0;

            while (start < end && nights < MAX_NIGHTS) {
                const dateStr = start.toISOString().split('T')[0];
                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = { activeGuests: 0, guestNames: [] };
                }
                dateMap[dateStr].activeGuests += 1;
                dateMap[dateStr].guestNames.push(guest.name);
                start.setDate(start.getDate() + 1);
                nights++;
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
                roomFare = getTariff(category, roomType, 'single');
            } else if (count === 2) {
                occupancy = 'Double';
                roomFare = getTariff(category, roomType, 'double');
            } else if (count > 2) {
                occupancy = 'Double';
                roomFare = getTariff(category, roomType, 'double');
                extraBeds = count - 2;
                extraBedCharge = extraBeds * 400; // Extra bed rate
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

    // --- CONTROLLER ACTIONS VIA API ---
    const handleUpdateGuestStatus = (roomId, guestId, status) => {
        setConfirmDialog({
            title: status === 'CHECKED_IN' ? 'Confirm Check-In' : 'Confirm Check-Out',
            message: `Are you sure you want to mark this guest as ${status === 'CHECKED_IN' ? 'Checked In' : 'Checked Out'}?`,
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    if (status === 'CHECKED_OUT') {
                        await receptionService.checkOutStay(guestId);
                    }
                    await loadDashboardData();
                } catch (err) {
                    setConfirmDialog({
                        title: "Operation Failed",
                        message: err.response?.data?.message || err.message || "Failed to update stay state.",
                        isAlert: true,
                        onConfirm: () => setConfirmDialog(null)
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleCheckOutStay = (g, roomNumber, booking) => {
        if (!booking) return;
        if (String(booking.category_id || booking.category_code) === '3' && booking.payment_state !== 'PAID') {
            setConfirmDialog({
                title: 'Payment Required',
                message: 'CAT-III bookings must be marked as PAID before Check-Out. Please collect payment and update the status in the Admin dashboard.',
                isAlert: true,
                onConfirm: () => setConfirmDialog(null)
            });
            return;
        }
        setConfirmDialog({
            title: 'Confirm Check-Out',
            message: `Are you sure you want to Check Out guest ${g.name || g.guest_name} from Room ${roomNumber}?`,
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    const res = await receptionService.checkOutStay(g.stay_id || g.guestId);
                    await loadDashboardData();
                    if (res?.data?.bookingFinished && res?.data?.booking?.booking_id) {
                        setInvoiceBookingId(res.data.booking.booking_id); // Auto-open GST Invoice
                    }
                } catch (err) {
                    setConfirmDialog({
                        title: "Operation Failed",
                        message: err.response?.data?.message || err.message || "Failed to check out guest stay.",
                        isAlert: true,
                        onConfirm: () => setConfirmDialog(null)
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleOpenTransfer = (guest, roomNumber, isGroupForce = false) => {
        setTransferModal({
            isOpen: true,
            stayId: guest.stay_id || guest.guestId,
            guestName: guest.guest_name || guest.name,
            currentRoomNumber: roomNumber,
            newRoomNumber: '',
            remarks: '',
            isGroup: isGroupForce || false
        });
    };

    const handleOpenOverride = (guest, roomNumber) => {
        setOverrideModal({
            isOpen: true,
            stayId: guest.stay_id || guest.guestId,
            guestName: guest.guest_name || guest.name,
            currentRoomNumber: roomNumber,
            newRoomType: guest.operational_room_type || 'Standard Room',
            newOccupancy: guest.occupancy_type || 'single',
            newTariff: guest.operational_tariff || 0,
            newExtraBed: !!guest.extra_bed,
            overrideReason: ''
        });
    };

    const handleConfirmTransfer = async () => {
        try {
            setLoading(true);
            await receptionService.roomTransfer(
                transferModal.stayId,
                transferModal.newRoomNumber,
                transferModal.remarks,
                transferModal.isGroup
            );
            setTransferModal({
                isOpen: false,
                stayId: null,
                guestName: '',
                currentRoomNumber: '',
                newRoomNumber: '',
                remarks: '',
                isGroup: false
            });
            await loadDashboardData();
        } catch (err) {
            setConfirmDialog({
                title: "Transfer Failed",
                message: err.response?.data?.message || err.message || "Failed to transfer room.",
                isAlert: true,
                onConfirm: () => setConfirmDialog(null)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSendToCleaning = (roomId) => {
        const activeRoom = (bookingData.rooms || []).find(r => r.roomId === roomId);
        if (!activeRoom || !activeRoom.activeBookingId) return;

        setConfirmDialog({
            title: 'Vacate Room',
            message: 'Vacate this room completely and send to cleaning? All active guest stays will be checked out.',
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    await receptionService.checkOut(activeRoom.activeBookingId);
                    await loadDashboardData();
                } catch (err) {
                    setConfirmDialog({
                        title: "Operation Failed",
                        message: err.response?.data?.message || err.message || "Failed to vacate room.",
                        isAlert: true,
                        onConfirm: () => setConfirmDialog(null)
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleMarkAsCleaned = async (roomId) => {
        try {
            setLoading(true);
            await receptionService.updateRoomStatus(roomId, 'available');
            await loadDashboardData();
        } catch (err) {
            setConfirmDialog({
                title: "Operation Failed",
                message: err.response?.data?.message || err.message || "Failed to update room status.",
                isAlert: true,
                onConfirm: () => setConfirmDialog(null)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRoom = async () => {
        // Validate all logical rooms have been assigned a physical room
        for (let appRoom of previewArrival.rooms) {
            if (!roomAssignments[appRoom.roomId]) {
                setConfirmDialog({
                    title: 'Missing Assignment',
                    message: `Please assign a physical room for Room ${appRoom.roomIndex + 1} (${appRoom.roomType}) before confirming.`,
                    isAlert: true,
                    onConfirm: () => setConfirmDialog(null)
                });
                return;
            }
        }

        try {
            setLoading(true);
            const roomListStr = previewArrival.rooms.map(appRoom => roomAssignments[appRoom.roomId]).join(', ');
            await receptionService.assignRooms(previewArrival.bookingId, roomListStr);

            // Reset states and stay on arrivals tab to let them check in individual guests
            setPreviewArrival(null);
            setAssignMode(false);
            setRoomAssignments({});

            await loadDashboardData();
        } catch (err) {
            setConfirmDialog({
                title: "Assignment Failed",
                message: err.response?.data?.message || err.message || "Failed to assign rooms.",
                isAlert: true,
                onConfirm: () => setConfirmDialog(null)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCheckInGuest = async (guestId) => {
        setConfirmDialog({
            title: 'Confirm Check-In',
            message: `Are you sure you want to Check In this guest now?`,
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    await receptionService.checkInGuest(guestId);
                    await loadDashboardData();
                } catch (err) {
                    setConfirmDialog({
                        title: "Check-In Failed",
                        message: err.response?.data?.message || err.message || "Failed to check in guest.",
                        isAlert: true,
                        onConfirm: () => setConfirmDialog(null)
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const isRoomAvailableForDates = (room, checkInDate, checkOutDate) => {
        if (!checkInDate || !checkOutDate) return true;
        const start = new Date(checkInDate).getTime();
        const end = new Date(checkOutDate).getTime();

        if (room.future_allocations && room.future_allocations.length > 0) {
            for (const alloc of room.future_allocations) {
                if (previewArrival && alloc.booking_id === previewArrival.bookingId) continue;
                const allocStart = new Date(alloc.allocated_from).getTime();
                const allocEnd = new Date(alloc.allocated_to).getTime();
                if (start < allocEnd && end > allocStart) {
                    return false;
                }
            }
        }
        return true;
    };

    const availableRoomsList = (bookingData.rooms || []).filter(r => r.status === 'AVAILABLE');
    const bookedRoomsList = (bookingData.rooms || []).filter(r => r.status === 'OCCUPIED');
    const cleaningRoomsList = (bookingData.rooms || []).filter(r => r.status === 'CLEANING');
    const selectedRoom = (bookingData.rooms || []).find(r => r.roomId === activeRoomId) || (bookingData.rooms && bookingData.rooms[0]);
    const { timeline, totalBill } = calculateRoomTimeline(selectedRoom);

    const receivedApplications = (bookingData.arrivals || []).filter(a => a.bookingState === 'ADMIN_APPROVED');
    const pendingArrivals = (bookingData.arrivals || []).filter(a => ['READY_FOR_CHECKIN', 'CHECKED_IN'].includes(a.bookingState));

    if (loading && bookingData.rooms.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-bold">Synchronizing FrontDesk Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
            {/* Error Notification */}
            {error && (
                <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold">Dismiss</button>
                </div>
            )}

            <QRScannerModal 
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScanSuccess={(decodedText) => {
                    setIsQRScannerOpen(false);
                    // Search in arrivals
                    const arrival = bookingData.arrivals.find(a => a.bookingId === decodedText || a.bookingId.split('-')[0] === decodedText);
                    if (arrival) {
                        setActiveTab('arrivals');
                        setPreviewArrival(arrival);
                        return;
                    }
                    // Search in rooms
                    const room = bookingData.rooms.find(r => r.active_booking && (r.active_booking.booking_id === decodedText || r.active_booking.booking_id.split('-')[0] === decodedText));
                    if (room) {
                        setActiveTab('rooms');
                        setActiveRoomId(room.room_number);
                        return;
                    }
                    alert("Application ID not found in today's arrivals or active rooms.");
                }}
            />

            {/* Top Navigation Strip */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                        <Bed className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">FrontDesk Reception Engine</h1>
                        <p className="text-xs text-slate-500 font-medium">Category {bookingData.category} Properties • Live Backend Integration</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsQRScannerOpen(true)}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                    >
                        <QrCode className="w-4 h-4" /> Scan App Pass
                    </button>
                    <button 
                        onClick={loadDashboardData}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                        Force Refresh
                    </button>
                </div>
            </div>

            {/* Time Machine / Clock Simulator Panel for Testing */}
            <div className="max-w-7xl mx-auto mb-6 p-4 bg-teal-50/40 border border-teal-100/70 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">Time Machine / Clock Simulator</h4>
                        <p className="text-xs text-slate-500">Test time-dependent stays & billing calculations across dates</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                    <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isMockActive}
                            onChange={handleToggleMock}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                        />
                        Mock Date-Time
                    </label>
                    <input 
                        type="datetime-local" 
                        value={mockDateStr}
                        onChange={handleMockDateChange}
                        disabled={!isMockActive}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400 font-semibold"
                    />
                    {isMockActive && (
                        <button 
                            onClick={handleResetMock}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl transition-colors border border-rose-200"
                        >
                            Undo / Reset
                        </button>
                    )}
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
                <button
                    onClick={() => setActiveTab('food')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'food' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Utensils className="w-4 h-4" /> Food Requirements
                </button>
            </div>

            <div className="max-w-7xl mx-auto">
                {activeTab === 'arrivals' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Column 1: Received Applications (Assign Rooms) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">Received Applications</h2>
                            
                            {receivedApplications.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No applications pending room assignment.</p>
                            ) : (
                                <div className="space-y-4">
                                    {receivedApplications.map(arr => (
                                        <div key={arr.bookingId} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-xs font-mono font-bold text-slate-400 block">{arr.bookingId.split('-')[0].toUpperCase()}</span>
                                                    <h3 className="font-bold text-lg text-slate-800">{arr.applicant}</h3>
                                                </div>
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Approved</span>
                                            </div>
                                            <div className="text-sm text-slate-600 mb-4 space-y-1">
                                                <p>{arr.rooms.reduce((acc, r) => acc + (r.guests || []).length, 0)} Guest(s) / {arr.rooms[0].roomType}</p>
                                                <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" /> 
                                                    Arriving: {new Date(arr.rawCheckIn).toLocaleDateString([], { dateStyle: 'medium' })}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => { setPreviewArrival(arr); setAssignMode(false); setRoomAssignments({}); }}
                                                className="w-full bg-slate-100 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors"
                                            >
                                                Block Room
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Column 2: Pending Check-Ins (Arrivals) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">Pending Arrivals</h2>
                            
                            {pendingArrivals.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No guests pending check-in today.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingArrivals.map(arr => {
                                        const isExpanded = !!expandedArrivals[arr.bookingId];
                                        return (
                                        <div key={arr.bookingId} className="border border-slate-200 rounded-xl p-5 shadow-sm">
                                            <div 
                                                className="flex justify-between items-start mb-3 cursor-pointer group"
                                                onClick={() => setExpandedArrivals(prev => ({ ...prev, [arr.bookingId]: !prev[arr.bookingId] }))}
                                            >
                                                <div>
                                                    <span className="text-xs font-mono font-bold text-slate-400 block group-hover:text-indigo-500 transition-colors">{arr.bookingId.split('-')[0].toUpperCase()}</span>
                                                    <h3 className="font-bold text-lg text-slate-800">{arr.applicant}</h3>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Rooms Assigned</span>
                                                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="text-slate-600 font-mono font-bold">
                                                    Rooms: {arr.allocatedRoomNumbers || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" /> 
                                                    Arriving: {new Date(arr.rawCheckIn).toLocaleDateString([], { dateStyle: 'medium' })}
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="space-y-2 mt-4 border-t pt-4 border-slate-100 animate-fade-in">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pending Guests</h4>
                                                    {arr.rawGuests.map(guest => {
                                                        const isCheckedIn = (bookingData.rooms || []).some(room => 
                                                            room.guests && room.guests.some(g => g.guest_id === guest.guest_id && g.stay_status === 'CHECKED_IN')
                                                        );

                                                        return (
                                                            <div key={guest.guest_id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                <div>
                                                                    <span className="font-bold text-sm text-slate-700 block">{guest.guest_name}</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                            IN: {new Date(guest.arrival_datetime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                                                        </span>
                                                                        {guest.departure_datetime && (
                                                                            <>
                                                                                <span className="text-[9px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                                    OUT: {new Date(guest.departure_datetime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                                                                </span>
                                                                                <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                                                                                    {Math.max(1, Math.ceil((new Date(guest.departure_datetime) - new Date(guest.arrival_datetime)) / (1000 * 60 * 60 * 24)))} Night(s)
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {guest.arrival_datetime && new Date(guest.arrival_datetime) > now ? (
                                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider px-3 py-1.5 border border-amber-100 rounded-lg bg-amber-50" title={`Can check in after ${new Date(guest.arrival_datetime).toLocaleString()}`}>
                                                                        Too Early
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmDialog({
                                                                                title: "Confirm Check-In",
                                                                                message: `Are you sure you want to check in ${guest.guest_name} now?`,
                                                                                onConfirm: async () => {
                                                                                    await handleCheckInGuest(guest.guest_id);
                                                                                    setConfirmDialog(null);
                                                                                }
                                                                            });
                                                                        }}
                                                                        disabled={isCheckedIn}
                                                                        className={`px-3 py-1.5 font-bold rounded-lg transition-colors text-xs shadow-sm border ${isCheckedIn ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'}`}
                                                                    >
                                                                        {isCheckedIn ? 'Checked In' : 'Check-In'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="flex flex-col gap-6 w-full font-sans">
                        {/* TOP PANEL: Room Navigation Matrix */}
                        <RoomMatrix 
                            rooms={bookingData.rooms || []} 
                            activeRoomIds={[activeRoomId]} 
                            onRoomClick={setActiveRoomId} 
                            now={now} 
                        />

                        {/* BOTTOM PANEL: Reception Operations & Dynamic Invoice Engine */}
                        <div className="w-full space-y-6">

                            {/* Section 1: Active Guests Status Board */}
                            {selectedRoom?.status === 'CLEANING' && (
                                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30 text-center animate-fade-in mb-6">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">Room is currently in Cleaning</h2>
                                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">This room was recently vacated and is being serviced by housekeeping. Mark it as clean to return it to the available pool.</p>
                                    <button 
                                        onClick={() => handleMarkAsCleaned(selectedRoom.roomId)}
                                        className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors shadow-md text-sm"
                                    >
                                        Mark as Cleaned & Available
                                    </button>
                                </div>
                            )}

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                        <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-indigo-500" /> Active Registry Details — Room {selectedRoom?.roomId}
                                        </h2>
                                    </div>

                                    {!selectedRoom || selectedRoom.guests.length === 0 ? (
                                        <p className="text-slate-400 text-sm py-4 text-center">No guests allocated to this room currently.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                                                        <th className="p-3">Guest Details</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Stay Dates</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectedRoom.guests.map(guest => {
                                                        const isOverstaying = guest.stay_status === 'CHECKED_IN' && guest.rawCheckOut && new Date(guest.rawCheckOut) < now;
                                                        return (
                                                        <tr key={guest.guestId || guest.stay_id} className={`hover:bg-slate-50/50 ${isOverstaying ? 'bg-red-50/50' : ''}`}>
                                                            <td className={`p-3 ${isOverstaying ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}>
                                                                <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                                    {guest.name || guest.guest_name}
                                                                    {isOverstaying && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Overstay</span>}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                    {guest.relation || guest.relation_to_applicant || 'Guest'}
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                    (guest.status || guest.stay_status) === 'CHECKED_IN' 
                                                                        ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                                                        : (guest.status || guest.stay_status) === 'CHECKED_OUT' 
                                                                            ? 'bg-slate-100 text-slate-600 border-slate-300' 
                                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                }`}>
                                                                    {guest.status || guest.stay_status || 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-mono text-[10px]">
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                    <div>
                                                                        <span className="text-slate-400 font-bold block mb-0.5">APPLIED</span>
                                                                        <div className="text-slate-600">IN: {guest.appliedCheckIn}</div>
                                                                        <div className="text-slate-600">OUT: {guest.appliedCheckOut}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-indigo-400 font-bold block mb-0.5">ACTUAL</span>
                                                                        <div className="text-indigo-700 font-bold">IN: {guest.actualCheckInStr || '---'}</div>
                                                                        <div className="text-indigo-700 font-bold">OUT: {guest.actualCheckOutStr || '---'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {(guest.status || guest.stay_status) === 'CHECKED_IN' ? (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={() => handleCheckOutStay(guest, selectedRoom.roomId, selectedRoom.active_booking)}
                                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200"
                                                                            title="Check Out Guest"
                                                                        >
                                                                            <LogOut className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (guest.status || guest.stay_status) === 'PENDING' ? (
                                                                    <div className="flex items-center justify-end">
                                                                        {guest.rawCheckIn && new Date(guest.rawCheckIn) > now ? (
                                                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider text-right" title={`Can check in after ${guest.checkIn}`}>
                                                                                Too Early
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleCheckInGuest(guest.guest_id || guest.guestId)}
                                                                                className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                                                                                title="Check In Guest"
                                                                            >
                                                                                Check-In
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase italic">
                                                                        {(guest.status || guest.stay_status) === 'CHECKED_OUT' ? 'Checked Out' : 'Pending'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            
                                            <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end gap-3">
                                                {selectedRoom.guests.find(g => (g.status || g.stay_status) === 'CHECKED_IN') && (
                                                    <button 
                                                        onClick={() => handleOpenTransfer(selectedRoom.guests.find(g => (g.status || g.stay_status) === 'CHECKED_IN'), selectedRoom.roomId, true)}
                                                        className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-colors shadow-sm flex items-center gap-2"
                                                    >
                                                        <ArrowLeftRight className="w-4 h-4" /> Transfer Room (All Guests)
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleSendToCleaning(selectedRoom.roomId)}
                                                    className="bg-slate-850 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-2"
                                                >
                                                    <LogOut className="w-4 h-4" /> Vacate Room & Send to Cleaning
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            {/* Section 1.5: Upcoming Allocations */}
                            {selectedRoom?.future_allocations && selectedRoom.future_allocations.length > 0 && (
                                <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-3">
                                        <h2 className="text-md font-bold text-indigo-800 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Allocations — Room {selectedRoom.roomId}
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-indigo-50 text-indigo-700 font-bold uppercase text-[11px] tracking-wider border-b border-indigo-100">
                                                    <th className="p-3">Applicant Name</th>
                                                    <th className="p-3">Booking ID</th>
                                                    <th className="p-3">From Date</th>
                                                    <th className="p-3">To Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-indigo-50">
                                                {selectedRoom.future_allocations.map((alloc, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/50">
                                                        <td className="p-3 font-semibold text-slate-800">{alloc.applicant_name}</td>
                                                        <td className="p-3 font-mono text-xs text-slate-500">{alloc.booking_id.split('-')[0].toUpperCase()}</td>
                                                        <td className="p-3 text-slate-600 font-medium">{new Date(alloc.allocated_from).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                                        <td className="p-3 text-slate-600 font-medium">{new Date(alloc.allocated_to).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Real-time Live Audited Dynamic Billing Ledger */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-indigo-500" /> Pricing Calculation & Occupancy Ledger
                                    </h2>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold text-slate-400 block">Total Active Room Invoice</span>
                                        <span className="text-xl font-extrabold text-indigo-600 font-mono">₹{totalBill}</span>
                                    </div>
                                </div>

                                {timeline.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-6 text-center">No calculations available. Occupancy details will display once stays commence.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Dynamic Invoice Metadata */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Property Category</span>
                                                <span className="font-bold text-slate-700 text-sm">Category {bookingData.category}</span>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Classification</span>
                                                <span className="font-bold text-slate-700 text-sm">{selectedRoom?.roomType}</span>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Billed Duration</span>
                                                <span className="font-bold text-slate-700 text-sm">{timeline.length} Night(s)</span>
                                            </div>
                                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Estimated Total</span>
                                                <span className="font-bold text-indigo-700 text-sm">₹{totalBill}</span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50 p-4">
                                            <div className="flex flex-col space-y-2 min-w-max">
                                                {/* Header row for dates */}
                                                <div className="flex mb-2 border-b border-slate-200 pb-2">
                                                    <div className="w-48 font-bold text-xs text-slate-500 uppercase shrink-0">Guest Details</div>
                                                    <div className="flex flex-1">
                                                        {timeline.map((day, idx) => (
                                                            <div key={idx} className="flex-1 text-center font-bold text-[10px] text-slate-400 w-24 shrink-0 px-1 border-r border-slate-200 last:border-0">
                                                                {new Date(day.date).toLocaleDateString([], {month:'short', day:'numeric'})}
                                                                <div className="font-mono text-indigo-500 bg-indigo-50 rounded mt-1">₹{day.dailyCharge}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Rows for each billed guest */}
                                                {selectedRoom.guests.filter(g => g.status === 'CHECKED_IN' || g.status === 'CHECKED_OUT').map((guest) => {
                                                    return (
                                                        <div key={guest.guestId || guest.guest_id} className="flex items-center group">
                                                            <div className="w-48 font-bold text-xs text-slate-700 truncate shrink-0 pr-4" title={guest.name || guest.guest_name}>
                                                                {guest.name || guest.guest_name}
                                                                <div className="text-[9px] font-normal text-slate-400 font-mono mt-0.5">{guest.stay_status}</div>
                                                            </div>
                                                            <div className="flex flex-1 relative h-7 bg-white border border-slate-100 rounded-md overflow-hidden shadow-sm">
                                                                {timeline.map((day, idx) => {
                                                                    const isGuestActiveOnDay = day.guestNames.includes(guest.name || guest.guest_name);
                                                                    return (
                                                                        <div 
                                                                            key={idx} 
                                                                            className={`flex-1 h-full border-r border-slate-50/50 w-24 shrink-0 transition-colors ${isGuestActiveOnDay ? 'bg-indigo-400 group-hover:bg-indigo-500' : 'bg-transparent'}`}
                                                                            title={isGuestActiveOnDay ? `Active on ${day.date}` : ''}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'food' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in w-full">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Utensils className="w-6 h-6 text-indigo-500" /> Food Requirements
                            </h2>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-slate-600">Select Date:</label>
                                <input 
                                    type="date" 
                                    value={foodFilterDate}
                                    onChange={(e) => setFoodFilterDate(e.target.value)}
                                    className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Room</th>
                                        <th className="p-4">Guest Name</th>
                                        <th className="p-4 text-center">Breakfast</th>
                                        <th className="p-4 text-center">Lunch</th>
                                        <th className="p-4 text-center">Dinner</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {(() => {
                                        let foodRows = [];
                                        (bookingData.rooms || []).forEach(room => {
                                            if (room.status === 'OCCUPIED' || room.status === 'AVAILABLE' || room.status === 'CLEANING') {
                                                const activeStays = room.guests;
                                                activeStays.forEach(guest => {
                                                    const prefs = (guest.food_preferences || []).filter(fp => fp.date === foodFilterDate);
                                                    if (prefs.length > 0) {
                                                        const p = prefs[0];
                                                        if (p.breakfast || p.lunch || p.dinner) {
                                                            foodRows.push({ room: room.roomId, guest: guest.guest_name || guest.name, prefs: p });
                                                        }
                                                    }
                                                });
                                            }
                                        });

                                        if (foodRows.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">
                                                        No food requirements found for guests on this date.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return foodRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-bold text-slate-800 border-r border-slate-50">{row.room}</td>
                                                <td className="p-4 border-r border-slate-50">{row.guest}</td>
                                                <td className="p-4 text-center border-r border-slate-50">
                                                    {row.prefs.breakfast ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase">Yes</span> : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="p-4 text-center border-r border-slate-50">
                                                    {row.prefs.lunch ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase">Yes</span> : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {row.prefs.dinner ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase">Yes</span> : <span className="text-slate-300">-</span>}
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEW & ASSIGN MODAL */}
            {previewArrival && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col transform transition-transform duration-300">
                        <div className="bg-indigo-600 p-6 text-white shrink-0 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Block Room</h2>
                                <p className="text-indigo-200 text-sm">{previewArrival.bookingId.split('-')[0].toUpperCase()} - {previewArrival.applicant}</p>
                            </div>
                            <button onClick={() => setPreviewArrival(null)} className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-500/50 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Booking Details</h3>
                            <div className="space-y-4 mb-6">
                                {previewArrival.rooms.map((appRoom, index) => (
                                    <div key={appRoom.roomId} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                            <div>
                                                <span className="font-bold text-slate-800">Room Slot {index + 1}</span>
                                                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{appRoom.roomType}</span>
                                            </div>
                                            {assignMode && (
                                                <select 
                                                    value={roomAssignments[appRoom.roomId] || ''}
                                                    onChange={e => setRoomAssignments({...roomAssignments, [appRoom.roomId]: e.target.value})}
                                                    className="p-1.5 text-xs rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                                >
                                                    <option value="">Select a physical room...</option>
                                                    {bookingData.rooms.filter(r => (r.roomType === appRoom.roomType || !appRoom.roomType) && isRoomAvailableForDates(r, previewArrival.rawCheckIn, previewArrival.rawCheckOut)).map(r => (
                                                        <option key={r.roomId} value={r.roomId}>Room {r.roomId} ({r.roomType})</option>
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
                            
                            {assignMode && (
                                <div className="mt-8 border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Select Rooms from Matrix</h3>
                                    <RoomMatrix 
                                        rooms={bookingData.rooms.map(r => ({
                                            ...r,
                                            status: isRoomAvailableForDates(r, previewArrival.rawCheckIn, previewArrival.rawCheckOut) ? 'AVAILABLE' : 'OCCUPIED'
                                        }))} 
                                        activeRoomIds={Object.values(roomAssignments)}
                                        onRoomClick={(physicalRoomId) => {
                                            const existingSlotId = Object.keys(roomAssignments).find(key => roomAssignments[key] === physicalRoomId);
                                            if (existingSlotId) {
                                                const newAssignments = { ...roomAssignments };
                                                delete newAssignments[existingSlotId];
                                                setRoomAssignments(newAssignments);
                                                return;
                                            }

                                            const physicalRoom = bookingData.rooms.find(r => r.roomId === physicalRoomId);
                                            if (!physicalRoom || !isRoomAvailableForDates(physicalRoom, previewArrival.rawCheckIn, previewArrival.rawCheckOut)) return;

                                            const availableSlot = previewArrival.rooms.find(appRoom => {
                                                if (roomAssignments[appRoom.roomId]) return false;
                                                return !appRoom.roomType || appRoom.roomType === physicalRoom.roomType;
                                            });

                                            if (availableSlot) {
                                                setRoomAssignments({ ...roomAssignments, [availableSlot.roomId]: physicalRoomId });
                                            }
                                        }}
                                        now={now}
                                        title="Available Rooms for these Dates"
                                        showCategories={false}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                            {!assignMode ? (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setPreviewArrival(null)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => setAssignMode(true)}
                                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                                    >
                                        Allocate Physical Rooms
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                    <h3 className="text-sm font-bold text-indigo-800 mb-4">Complete Room Assignments</h3>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setAssignMode(false)}
                                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors text-xs"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={handleAssignRoom}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-xs"
                                        >
                                            Confirm Block
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ROOM TRANSFER MODAL */}
            {transferModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <ArrowLeftRight className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-800">Transfer Room</h3>
                                <p className="text-sm text-slate-500">Transfer guest to another available room.</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Guest</label>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3">{transferModal.guestName}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Current Room</label>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3">Room {transferModal.currentRoomNumber}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select New Room *</label>
                                <select
                                    value={transferModal.newRoomNumber}
                                    onChange={e => setTransferModal(prev => ({ ...prev, newRoomNumber: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                >
                                    <option value="">-- Choose Available Room --</option>
                                    {availableRoomsList.map(r => (
                                        <option key={r.roomId} value={r.roomId}>
                                            Room {r.roomId} ({r.roomType} - Floor {r.floor})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transfer Type</label>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={transferModal.isGroup} 
                                        onChange={e => setTransferModal(prev => ({ ...prev, isGroup: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Group Transfer (Transfer all active guests in this room)
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks / Reason *</label>
                                <textarea
                                    value={transferModal.remarks}
                                    onChange={e => setTransferModal(prev => ({ ...prev, remarks: e.target.value }))}
                                    placeholder="Provide transfer reason..."
                                    className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setTransferModal({ isOpen: false, stayId: null, guestName: '', currentRoomNumber: '', newRoomNumber: '', remarks: '', isGroup: false })}
                                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmTransfer}
                                disabled={!transferModal.newRoomNumber || !transferModal.remarks.trim() || loading}
                                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {loading ? 'Transferring...' : 'Confirm Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BILL/INVOICE MODAL */}
            {invoiceBookingId && <GSTInvoiceModal bookingId={invoiceBookingId} onClose={() => setInvoiceBookingId(null)} />}

            {/* CUSTOM IN-APP CONFIRMATION DIALOG */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in p-6 text-center animate-scale-up">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">{confirmDialog.title}</h2>
                        <p className="text-slate-600 text-sm mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3 justify-center">
                            {!confirmDialog.isAlert && (
                                <button 
                                    onClick={() => setConfirmDialog(null)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
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
