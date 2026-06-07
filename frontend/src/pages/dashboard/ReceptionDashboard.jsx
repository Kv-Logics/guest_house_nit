import React, { useState, useEffect } from 'react';
import { Bed, UserPlus, LogOut, Receipt, Shield, Calendar, Users, DollarSign, Trash2, UserCheck, CheckCircle2, Sliders, Clock, ArrowLeftRight, ChevronDown, ChevronUp, X, Utensils, Activity, CheckCircle, XCircle, ArrowRight, Home, Settings, FileText, User, Bell, Search, Filter, HelpCircle, Loader2, Save, Printer, CreditCard, Plus, QrCode } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import GSTInvoiceModal from '../../pages/booking/GSTInvoiceModal';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import QRScannerModal from '../../components/ui/QRScannerModal';
import RoomHistoryDrawer from '../../components/dashboard/RoomHistoryDrawer';
import ArrivalsTab from '../../components/reception/ArrivalsTab';
import RoomsTab from '../../components/reception/RoomsTab';
import FoodTab from '../../components/reception/FoodTab';
import RoomAssignmentModal from '../../components/reception/RoomAssignmentModal';
import RoomTransferModal from '../../components/reception/RoomTransferModal';
import PaymentsTab from '../../components/reception/PaymentsTab';
import BulkRoomsTab from '../../components/reception/BulkRoomsTab';
import ExtensionsTab from '../../components/reception/ExtensionsTab';

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
            booking_id: b.booking_id,
            formatted_id: b.formatted_id || '',
            booking_seq: b.booking_seq,
            bookingSeq: b.booking_seq,
            applicant: b.applicant_name,
            category: b.category_id,
            bookingState: b.booking_state,
            booking_state: b.booking_state,
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
                        expected_departure: g.expected_departure,
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
                        booking_id: g.booking_id,
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
            status: status,
            guests: guests,
            activeBookingId: activeBookingId,
            active_booking: r.active_booking,
            future_allocations: r.future_allocations || []
        };
    });
};

export default function ReceptionDashboard() {
    const { user } = useAuth();
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [bookingData, setBookingData] = useState({ category: 'I', arrivals: [], rooms: [] });
    const [loading, setLoading] = useState(true);
    const [forceCheckoutModal, setForceCheckoutModal] = useState({
        isOpen: false,
        bookingId: null,
        stayId: null,
        roomNumber: null,
        guestName: '',
        isRoomVacate: false
    });
    const [error, setError] = useState(null);
    const [tariffs, setTariffs] = useState([]);

    const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' | 'rooms' | 'food'
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [foodFilterDate, setFoodFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    const [historyDrawer, setHistoryDrawer] = useState({ isOpen: false, roomNumber: null });
    
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
    let isTimeMachineEnabled = import.meta.env.VITE_ENABLE_TIME_MACHINE === 'true';
    try {
        const sysConfigStr = localStorage.getItem('sys-config');
        if (sysConfigStr) {
            isTimeMachineEnabled = JSON.parse(sysConfigStr).enable_time_machine !== false;
        }
    } catch(e) {}
    
    const [isMockActive, setIsMockActive] = useState(isTimeMachineEnabled && localStorage.getItem('mock-system-date-active') === 'true');
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
            const tariffsRes = await receptionService.getTariffs();

            const translatedArrivals = translateArrivalsFromBackend(arrivalsRes.data);
            const translatedRooms = translateRoomsFromBackend(roomsRes.data);

            if (tariffsRes.success) {
                setTariffs(tariffsRes.data);
            }

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

    const handleCheckOutStay = (g, roomNumber, booking, forceInit = false) => {
        if (!booking) return;

        if (forceInit) {
            setForceCheckoutModal({
                isOpen: true,
                bookingId: booking.booking_id,
                stayId: g.stay_id || g.guestId,
                roomNumber: roomNumber,
                guestName: g.name || g.guest_name,
                isRoomVacate: false
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
                    if (res.data?.bookingFinished && booking.payment_state !== 'PAID') {
                        setActiveTab('payments');
                    } else if (res?.data?.bookingFinished && res?.data?.booking?.booking_id) {
                        setInvoiceBookingId(res.data.booking.booking_id); // Auto-open GST Invoice
                    }
                } catch (err) {
                    if (err.response?.data?.message === 'PAYMENT_REQUIRED' || err.message === 'PAYMENT_REQUIRED') {
                        setConfirmDialog({
                            title: "Payment Required",
                            message: "Payment must be settled before checkout since it is guest responsibility. Redirecting to Payments tab.",
                            isAlert: true,
                            onConfirm: () => {
                                setConfirmDialog(null);
                                setActiveTab('payments');
                            }
                        });
                    } else {
                        setConfirmDialog({
                            title: "Operation Failed",
                            message: err.response?.data?.message || err.message || "Failed to check out guest stay.",
                            isAlert: true,
                            onConfirm: () => setConfirmDialog(null)
                        });
                    }
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

        const booking = activeRoom.active_booking;
        const needsPayment = booking && booking.payment_responsible === 'guest' && booking.payment_state !== 'PAID' && booking.payment_state !== 'NOT_APPLICABLE';
        const isAdmin = ['super_admin', 'guest_house_admin'].includes(user?.role);

        if (needsPayment) {
            if (isAdmin) {
                setConfirmDialog({
                    title: 'Payment Required',
                    message: `Payment must be settled before vacating this room since it is guest responsibility. Alternatively, you can force checkout as Admin.`,
                    isAlert: false,
                    onConfirm: () => {
                        setConfirmDialog(null);
                        setForceCheckoutModal({
                            isOpen: true,
                            bookingId: activeRoom.activeBookingId,
                            stayId: null,
                            roomNumber: roomId,
                            guestName: 'All room guests (Vacate Room)',
                            isRoomVacate: true
                        });
                    }
                });
            } else {
                setConfirmDialog({
                    title: 'Payment Required',
                    message: `Payment must be settled before vacating this room since it is guest responsibility. Redirecting to Payments tab.`,
                    isAlert: true,
                    onConfirm: () => {
                        setConfirmDialog(null);
                        setActiveTab('payments');
                    }
                });
            }
            return;
        }

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
                    const activeBooking = activeRoom.active_booking;
                    if (activeBooking && activeBooking.payment_state !== 'PAID') {
                        setActiveTab('payments');
                    }
                } catch (err) {
                    if (err.response?.data?.message === 'PAYMENT_REQUIRED' || err.message === 'PAYMENT_REQUIRED') {
                        setConfirmDialog({
                            title: "Payment Required",
                            message: "Payment must be settled before vacating this room since it is guest responsibility. Redirecting to Payments tab.",
                            isAlert: true,
                            onConfirm: () => {
                                setConfirmDialog(null);
                                setActiveTab('payments');
                            }
                        });
                    } else {
                        setConfirmDialog({
                            title: "Operation Failed",
                            message: err.response?.data?.message || err.message || "Failed to vacate room.",
                            isAlert: true,
                            onConfirm: () => setConfirmDialog(null)
                        });
                    }
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
                <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-bold">Dismiss</button>
                </div>
            )}

            <QRScannerModal 
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScanSuccess={(decodedText) => {
                    setIsQRScannerOpen(false);
                    const cleanText = String(decodedText || '').trim();
                    const shortId = cleanText.includes('/') 
                        ? cleanText.split('/').pop().toUpperCase() 
                        : cleanText.split('-')[0].toUpperCase();

                    // Search in arrivals
                    const arrival = bookingData.arrivals.find(a => {
                        const aShort = (a.bookingId || '').split('-')[0].toUpperCase();
                        return aShort === shortId;
                    });
                    if (arrival) {
                        setActiveTab('arrivals');
                        setPreviewArrival(arrival);
                        return;
                    }
                    // Search in rooms
                    const room = bookingData.rooms.find(r => {
                        if (!r.active_booking) return false;
                        const bShort = (r.active_booking.booking_id || '').split('-')[0].toUpperCase();
                        return bShort === shortId;
                    });
                    if (room) {
                        setActiveTab('rooms');
                        setActiveRoomId(room.roomId || room.room_number);
                        return;
                    }
                    alert("Application ID not found in today's arrivals or active rooms.");
                }}
            />

            {/* Top Navigation Strip */}
            <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
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
            {isTimeMachineEnabled && (
            <div className="w-full mb-6 p-4 bg-teal-50/40 border border-teal-100/70 rounded-2xl flex flex-wrap items-center justify-between gap-4">
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
            )}

            {/* Navigation Tabs */}
            <div className="w-full flex gap-2 mb-6">
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

                <button
                    onClick={() => setActiveTab('bulk')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'bulk' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Users className="w-4 h-4" /> Bulk Blocks
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'payments' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <CreditCard className="w-4 h-4" /> Payments
                </button>
                <button
                    onClick={() => setActiveTab('extensions')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'extensions' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <ArrowLeftRight className="w-4 h-4" /> Extensions
                </button>
            </div>

            <div className="w-full">
                {activeTab === 'extensions' && (
                    <ExtensionsTab />
                )}
                {activeTab === 'arrivals' && (
                    <ArrivalsTab
                        receivedApplications={receivedApplications}
                        pendingArrivals={pendingArrivals}
                        expandedArrivals={expandedArrivals}
                        setExpandedArrivals={setExpandedArrivals}
                        bookingData={bookingData}
                        now={now}
                        onAssignRoomClick={(arr) => {
                            setPreviewArrival(arr);
                            setAssignMode(false);
                            setRoomAssignments({});
                        }}
                        onCheckInGuest={handleCheckInGuest}
                    />
                )}

                {activeTab === 'rooms' && (
                    <RoomsTab
                        rooms={bookingData.rooms || []}
                        activeRoomId={activeRoomId}
                        setActiveRoomId={setActiveRoomId}
                        selectedRoom={selectedRoom}
                        now={now}
                        userRole={user?.role}
                        handleMarkAsCleaned={handleMarkAsCleaned}
                        handleCheckOutStay={handleCheckOutStay}
                        handleOpenTransfer={handleOpenTransfer}
                        handleSendToCleaning={handleSendToCleaning}
                        handleOpenHistory={(roomId) => setHistoryDrawer({ isOpen: true, roomNumber: roomId })}
                        handleCheckInGuest={handleCheckInGuest}
                        timeline={timeline}
                        totalBill={totalBill}
                    />
                )}

                {activeTab === 'food' && (
                    <FoodTab
                        bookingData={bookingData}
                        now={now}
                        foodFilterDate={foodFilterDate}
                        setFoodFilterDate={setFoodFilterDate}
                    />
                )}



                {activeTab === 'bulk' && (
                    <BulkRoomsTab
                        allRooms={bookingData.rooms || []}
                        isRoomAvailableForDates={isRoomAvailableForDates}
                    />
                )}

                {activeTab === 'payments' && (
                    <PaymentsTab
                        onBillGenerated={(bookingId) => {
                            setInvoiceBookingId(bookingId);
                        }}
                    />
                )}
            </div>

            {/* PREVIEW & ASSIGN MODAL */}
            <RoomAssignmentModal
                isOpen={!!previewArrival}
                onClose={() => setPreviewArrival(null)}
                onConfirm={async (roomListStr) => {
                    try {
                        setLoading(true);
                        await receptionService.assignRooms(previewArrival.bookingId, roomListStr);
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
                }}
                arrivalData={previewArrival}
                allRooms={bookingData.rooms || []}
                isRoomAvailableForDates={isRoomAvailableForDates}
                loading={loading}
            />

            {/* ROOM TRANSFER MODAL */}
            <RoomTransferModal
                isOpen={transferModal.isOpen}
                onClose={() => setTransferModal({
                    isOpen: false,
                    stayId: null,
                    guestName: '',
                    currentRoomNumber: '',
                    newRoomNumber: '',
                    remarks: '',
                    isGroup: false
                })}
                onConfirm={async ({ stayId, newRoomNumber, remarks, isGroup }) => {
                    try {
                        setLoading(true);
                        await receptionService.roomTransfer(stayId, newRoomNumber, remarks, isGroup);
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
                }}
                transferData={transferModal}
                availableRooms={(bookingData.rooms || []).filter(r => r.status === 'AVAILABLE')}
                loading={loading}
            />

            {/* BILL/INVOICE MODAL */}
            {invoiceBookingId && <GSTInvoiceModal bookingId={invoiceBookingId} onClose={() => setInvoiceBookingId(null)} />}

            {/* FORCE CHECKOUT MODAL */}
            {forceCheckoutModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in animate-scale-up">
                        {/* Header */}
                        <div className="bg-red-600 p-6 text-white flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                                    Force Check-Out
                                </h2>
                                <p className="text-red-100 text-xs">
                                    {forceCheckoutModal.isRoomVacate
                                        ? `Force check-out / vacate for Room ${forceCheckoutModal.roomNumber}`
                                        : `Force check-out for guest: ${forceCheckoutModal.guestName}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setForceCheckoutModal({ ...forceCheckoutModal, isOpen: false })}
                                className="text-red-100 hover:text-white p-1 rounded-lg hover:bg-red-500/50 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const reason = e.target.elements.overrideReason.value.trim();
                            if (!reason) return;
                            try {
                                setLoading(true);
                                setForceCheckoutModal(prev => ({ ...prev, isOpen: false }));
                                if (forceCheckoutModal.isRoomVacate) {
                                    await receptionService.checkOut(forceCheckoutModal.bookingId, { force: true, forceReason: reason });
                                } else {
                                    await receptionService.checkOutStay(forceCheckoutModal.stayId, { force: true, forceReason: reason });
                                }
                                await loadDashboardData();
                            } catch (err) {
                                setConfirmDialog({
                                    title: "Operation Failed",
                                    message: err.response?.data?.message || err.message || "Force checkout failed.",
                                    isAlert: true,
                                    onConfirm: () => setConfirmDialog(null)
                                });
                            } finally {
                                setLoading(false);
                            }
                        }}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Room / Guest</label>
                                    <input 
                                        type="text" 
                                        disabled 
                                        value={forceCheckoutModal.isRoomVacate ? `Room ${forceCheckoutModal.roomNumber}` : `${forceCheckoutModal.guestName} (Room ${forceCheckoutModal.roomNumber})`}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Override Reason (Required)</label>
                                    <textarea 
                                        name="overrideReason"
                                        required
                                        placeholder="Explain why this checkout is being forced without payment (e.g., institution-sponsored, cash payment collected manually, etc.)..."
                                        rows={4}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-semibold text-slate-700 placeholder-slate-400 bg-slate-50 resize-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 justify-end">
                                <button 
                                    type="button"
                                    onClick={() => setForceCheckoutModal({ ...forceCheckoutModal, isOpen: false })}
                                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm text-xs"
                                >
                                    Force Checkout
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ROOM HISTORY DRAWER */}
            <RoomHistoryDrawer
                isOpen={historyDrawer.isOpen}
                roomNumber={historyDrawer.roomNumber}
                onClose={() => setHistoryDrawer({ isOpen: false, roomNumber: null })}
            />

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
