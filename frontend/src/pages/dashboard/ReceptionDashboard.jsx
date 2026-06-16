import React, { useState, useEffect } from 'react';
import { Bed, UserPlus, LogOut, Receipt, Shield, Calendar, Users, DollarSign, Trash2, UserCheck, CheckCircle2, Sliders, Clock, ArrowLeftRight, ChevronDown, ChevronUp, X, Utensils, Activity, CheckCircle, XCircle, ArrowRight, Home, Settings, FileText, User, Bell, Search, Filter, HelpCircle, Loader2, Save, Printer, CreditCard, Plus, QrCode } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import { bookingService } from '../../services/booking.service';
import { getFormattedBookingId } from '../../utils/booking';
import api from '../../services/api';
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
import ExtensionsTab from '../../components/reception/ExtensionsTab';
import RoomMatrixTab from '../../components/reception/RoomMatrixTab';
import BookingSearchTab from '../../components/reception/BookingSearchTab';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import CheckedOutLedgerModal from '../../components/reception/CheckedOutLedgerModal';
import BulkBookingsTab from '../../components/reception/bulk_booking/BulkBookingsTab';
import StayRegisterTab from '../../components/admin/StayRegisterTab';

// Default Pricing Configuration
const PRICING_CONFIG = {
    "Standard Room": { single: 2000, double: 3500, extraBed: 400 },
    "Suite Room": { single: 4000, double: 6500, extraBed: 400 },
    "Mini Suite Room": { single: 2500, double: 4000, extraBed: 400 },
    "Renovated Room": { single: 3000, double: 5000, extraBed: 400 }
};

import { translateArrivalsFromBackend, translateRoomsFromBackend } from '../../utils/receptionUtils';

export default function ReceptionDashboard() {
    const { user } = useAuth();
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [bookingData, setBookingData] = useState({ category: 'I', arrivals: [], rooms: [] });
    const [loading, setLoading] = useState(true);
    const [forceCheckoutModal, setForceCheckoutModal] = useState({ isOpen: false, bookingId: null, stayId: null, roomNumber: '', guestName: '', isRoomVacate: false });

    const [confirmDialog, setConfirmDialog] = useState(null);
    const [error, setError] = useState(null);
    const [tariffs, setTariffs] = useState([]);

    const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' | 'rooms' | 'food'
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [foodFilterDate, setFoodFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    const [historyDrawer, setHistoryDrawer] = useState({ isOpen: false, roomNumber: null });
    const [viewBookingId, setViewBookingId] = useState(null);
    const [checkedOutLedgerData, setCheckedOutLedgerData] = useState(null);
    
    // Check-In Modal State
    const [previewArrival, setPreviewArrival] = useState(null);
    const [assignMode, setAssignMode] = useState(false);
    const [roomAssignments, setRoomAssignments] = useState({});
    

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
    } catch (e) {
        // config not set or invalid JSON
    }
    
    const [isMockActive, setIsMockActive] = useState(isTimeMachineEnabled && localStorage.getItem('mock-system-date-active') === 'true');
    const [mockDateStr, setMockDateStr] = useState(localStorage.getItem('mock-system-date') || '');
    const [now, setNow] = useState(new Date());

    const handleDownloadInvoice = async (bookingId) => {
        try {
            const res = await bookingService.downloadInvoice(bookingId);
            const blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Try to find the booking object in our arrivals to get the formatted ID
            const bookingObj = bookingData.arrivals.find(a => a.booking_id === bookingId || a.bookingId === bookingId);
            let filename = `invoice-${bookingId.split('-')[0].toUpperCase()}.pdf`;
            
            if (bookingObj) {
                const formattedId = getFormattedBookingId(bookingObj).replace(/[/:]/g, '_').toUpperCase();
                filename = `invoice-${formattedId}.pdf`;
            } else {
                // If not in arrivals, fetch the booking details from the API to get the formatted ID
                try {
                    const bookingRes = await api.get(`/bookings/${bookingId}`);
                    if (bookingRes.success && bookingRes.data) {
                        const formattedId = getFormattedBookingId(bookingRes.data).replace(/[/:]/g, '_').toUpperCase();
                        filename = `invoice-${formattedId}.pdf`;
                    }
                } catch (e) {
                    console.error("Failed to fetch booking details for filename:", e);
                }
            }
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Failed to download invoice';
            alert(errMsg);
        }
    };
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
    const [pendingExtensionsCount, setPendingExtensionsCount] = useState(0);

    // Load data from backend API
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const arrivalsRes = await receptionService.getTodayArrivals();
            const roomsRes = await receptionService.getRooms();
            const tariffsRes = await receptionService.getTariffs();
            const extensionsRes = await receptionService.getPendingExtensionAllocations().catch(() => ({ data: [] }));

            const translatedArrivals = translateArrivalsFromBackend(arrivalsRes.data);
            const translatedRooms = translateRoomsFromBackend(roomsRes.data);

            if (tariffsRes.success) {
                setTariffs(tariffsRes.data);
            }

            setPendingExtensionsCount((extensionsRes.data || []).length);

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
            title: "Confirm Check-Out",
            message: `Are you sure you want to Check Out guest ${g.name || g.guest_name}?`,
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    
                    const res = await receptionService.checkOutStay(g.stay_id || g.guestId);
                    await loadDashboardData();
                    
                    // Show payment tab or invoice if applicable (skip download for Category 1)
                    if (res.data?.bookingFinished && res.data?.booking?.category_id === 1) {
                        // Category 1: do nothing as no invoice/billing generated
                    } else if (res.data?.bookingFinished && res.data?.booking?.payment_state !== 'PAID') {
                        setActiveTab('payments');
                    } else if (res?.data?.bookingFinished && res?.data?.booking?.booking_id) {
                        handleDownloadInvoice(res.data.booking.booking_id);
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
                            message: err.response?.data?.message || err.message || "Failed to check out guest.",
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

        setConfirmDialog({
            title: "Confirm Check-Out",
            message: `Are you sure you want to Check Out all guests and vacate Room ${activeRoom.roomNumber || roomId}?`,
            isAlert: false,
            onConfirm: async () => {
                try {
                    setConfirmDialog(null);
                    setLoading(true);
                    
                    const res = await receptionService.checkOut(activeRoom.activeBookingId);
                    await loadDashboardData();
                    
                    // Show payment tab or invoice if applicable (skip download for Category 1)
                    if (res.data?.bookingFinished && res.data?.booking?.category_id === 1) {
                        // Category 1: do nothing as no invoice/billing generated
                    } else if (res.data?.bookingFinished && res.data?.booking?.payment_state !== 'PAID') {
                        setActiveTab('payments');
                    } else if (res?.data?.bookingFinished && res?.data?.booking?.booking_id) {
                        handleDownloadInvoice(res.data.booking.booking_id);
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
                            message: err.response?.data?.message || err.message || "Failed to check out guests.",
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

    const handleSendToMaintenance = async (roomId) => {
        try {
            setLoading(true);
            await receptionService.updateRoomStatus(roomId, 'maintenance');
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
    const bookedRoomsList = (bookingData.rooms || []).filter(r => r.status === 'OCCUPIED' || r.status === 'DOUBLE_OCCUPIED');
    const cleaningRoomsList = (bookingData.rooms || []).filter(r => r.status === 'CLEANING');
    const selectedRoom = (bookingData.rooms || []).find(r => r.roomId === activeRoomId) || (bookingData.rooms && bookingData.rooms[0]);
    const { timeline, totalBill } = calculateRoomTimeline(selectedRoom);

    const receivedApplications = (bookingData.arrivals || []).filter(a => a.bookingState === 'ADMIN_APPROVED' && a.bookingType !== 'BULK_BOOKING');
    const pendingArrivals = (bookingData.arrivals || []).filter(a => ['READY_FOR_CHECKIN', 'CHECKED_IN'].includes(a.bookingState) && a.bookingType !== 'BULK_BOOKING');

    const getArrivalsBadgeCount = () => {
        const receivedCount = receivedApplications.length;
        let pendingCount = 0;
        pendingArrivals.forEach(arr => {
            const roomNumbersStr = arr.allocatedRoomNumbers || '';
            const roomNumbers = roomNumbersStr.split(',').map(r => r.trim()).filter(Boolean);
            if (roomNumbers.length === 0 || !arr.rawGuests || arr.rawGuests.length === 0) {
                const pendingGuests = (arr.rawGuests || []).filter(guest => {
                    return !(bookingData.rooms || []).some(room => 
                        room.guests && room.guests.some(g => g.guest_id === guest.guest_id && g.stay_status === 'CHECKED_IN')
                    );
                });
                if (pendingGuests.length > 0) {
                    pendingCount += 1;
                }
                return;
            }
            
            const uniqueIndices = Array.from(new Set(arr.rawGuests.map(g => g.room_index || 0))).sort((a,b)=>a-b);
            
            roomNumbers.forEach((roomNo, i) => {
                const roomGuests = arr.rawGuests.filter(g => {
                    const mappedIdx = uniqueIndices.indexOf(g.room_index || 0);
                    return (mappedIdx % roomNumbers.length) === i;
                });
                
                const pendingRoomGuests = roomGuests.filter(guest => {
                    return !(bookingData.rooms || []).some(room => 
                        room.guests && room.guests.some(g => g.guest_id === guest.guest_id && g.stay_status === 'CHECKED_IN')
                    );
                });

                if (pendingRoomGuests.length > 0) {
                    pendingCount += 1;
                }
            });
        });
        return receivedCount + pendingCount;
    };

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
                    if (!decodedText || !decodedText.trim()) return;
                    
                    setLoading(true);
                    receptionService.decodeQrCode(decodedText)
                        .then(res => {
                            if (res.success && res.data) {
                                const { booking, state, roomSuffix, guestLedger, stayLedger } = res.data;
                                
                                if (state === 'staying') {
                                    let targetRoomNo = null;
                                    const activeStays = guestLedger.filter(s => s.stay_status === 'CHECKED_IN');
                                    if (activeStays.length > 0) {
                                        if (roomSuffix && !isNaN(roomSuffix)) {
                                            const idx = parseInt(roomSuffix, 10) - 1;
                                            if (idx >= 0 && idx < activeStays.length) {
                                                targetRoomNo = activeStays[idx].room_number;
                                            }
                                        }
                                        if (!targetRoomNo) {
                                            targetRoomNo = activeStays[0].room_number;
                                        }
                                    }
                                    
                                    if (targetRoomNo) {
                                        const roomObj = bookingData.rooms.find(r => 
                                            String(r.roomNumber) === String(targetRoomNo) || 
                                            String(r.roomId) === String(targetRoomNo) || 
                                            String(r.room_number) === String(targetRoomNo)
                                        );
                                        if (roomObj) {
                                            setActiveTab('rooms');
                                            setActiveRoomId(roomObj.roomId);
                                            return;
                                        }
                                    }
                                    alert(`Guest is staying, but room details could not be found in active inventory.`);
                                    
                                } else if (state === 'pending_assignment') {
                                    const arrivalData = {
                                        bookingId: booking.booking_id,
                                        booking_id: booking.booking_id,
                                        formatted_id: booking.formatted_id,
                                        applicant: booking.applicant_name,
                                        rooms_required: booking.rooms_required,
                                        room_type: booking.room_type,
                                        arrival_datetime: booking.arrival_datetime,
                                        departure_datetime: booking.departure_datetime,
                                        rawCheckIn: booking.arrival_datetime,
                                        rawCheckOut: booking.departure_datetime,
                                        bookingState: booking.booking_state,
                                        booking_state: booking.booking_state,
                                        category: booking.category_code || `CAT-${booking.category_id}`,
                                        categoryId: booking.category_id,
                                        rooms: booking.guests ? Array.from(new Set(booking.guests.map(g => g.room_index || 0))).map(idx => ({
                                            roomId: `${booking.booking_id}_room_${idx}`,
                                            roomIndex: idx,
                                            roomType: booking.room_type,
                                            guests: booking.guests.filter(g => g.room_index === idx).map(g => ({
                                                guestId: g.guest_id,
                                                guest_id: g.guest_id,
                                                name: g.guest_name,
                                                relation: g.relation_to_applicant,
                                                phone: g.phone,
                                                email: g.email
                                            }))
                                        })) : []
                                    };
                                    setActiveTab('arrivals');
                                    setPreviewArrival(arrivalData);
                                    
                                } else if (state === 'assigned_room') {
                                    setActiveTab('arrivals');
                                    const expanded = {};
                                    expanded[booking.booking_id] = true;
                                    if (booking.allocated_room_numbers) {
                                        booking.allocated_room_numbers.split(',').forEach(roomNo => {
                                            expanded[`${booking.booking_id}:${roomNo.trim()}`] = true;
                                        });
                                    }
                                    setExpandedArrivals(prev => ({ ...prev, ...expanded }));
                                    
                                } else if (state === 'checked_out') {
                                    setCheckedOutLedgerData({
                                        booking,
                                        guestLedger,
                                        stayLedger
                                    });
                                    
                                } else {
                                    alert(`Booking state: ${booking.booking_state.replace(/_/g, ' ')}`);
                                }
                            }
                        })
                        .catch(err => {
                            alert(err.response?.data?.message || err.message || "QR Code check failed.");
                        })
                        .finally(() => {
                            setLoading(false);
                        });
                }}
            />

            {/* Layout Wrapper */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left Sidebar Navigation */}
                <aside className="w-full lg:w-72 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:sticky lg:top-6 flex flex-col justify-between shrink-0 lg:h-[calc(100vh-3rem)]">
                    <div className="space-y-6">
                        {/* Header Area */}
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
                                <Bed className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black tracking-tight text-slate-800 leading-none">FrontDesk Engine</h1>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1.5">Category {bookingData.category} Properties</p>
                            </div>
                        </div>

                        {/* Navigation Menu Links */}
                        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
                            <button
                                onClick={() => setActiveTab('arrivals')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'arrivals' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <UserCheck className="w-4 h-4 shrink-0" /> 
                                <span className="flex-1 text-left hidden lg:inline">Arrivals</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    activeTab === 'arrivals' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {getArrivalsBadgeCount()}
                                </span>
                            </button>
                            
                            <button
                                onClick={() => setActiveTab('rooms')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'rooms' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <Bed className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Rooms Inventory</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('food')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'food' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <Utensils className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Food Requirements</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('bulk_bookings')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'bulk_bookings' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Bulk Bookings</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'payments' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <CreditCard className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Payments Ledger</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('extensions')}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'extensions' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1 hidden lg:inline">Stay Extensions</span>
                                {pendingExtensionsCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                        {pendingExtensionsCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('enquiry')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'enquiry' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <Search className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Search & Enquiry</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('stay_register')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-xs w-auto lg:w-full shrink-0 ${
                                    activeTab === 'stay_register' 
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="text-left flex-1">Stay Register</span>
                            </button>
                        </nav>
                    </div>

                    {/* Sidebar Footer Actions */}
                    <div className="border-t border-slate-100 pt-5 space-y-2 mt-6 lg:mt-0 w-full">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center select-none mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Signed in as</p>
                            <p className="text-xs font-extrabold text-slate-700 mt-1 truncate">{user?.faculty_name || user?.full_name}</p>
                        </div>
                        <button 
                            onClick={() => setIsQRScannerOpen(true)}
                            className="w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                            <QrCode className="w-4 h-4" /> Scan App Pass
                        </button>
                        <button 
                            onClick={loadDashboardData}
                            className="w-full px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                            Force Refresh
                        </button>
                    </div>
                </aside>

                {/* Right Side Content Panel */}
                <main className="flex-1 min-w-0 w-full space-y-6">
                    {/* Time Machine / Clock Simulator Panel for Testing */}
                    {isTimeMachineEnabled && (
                    <div className="w-full p-4 bg-teal-50/40 border border-teal-100/70 rounded-2xl flex flex-wrap items-center justify-between gap-4">
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

                    {/* Active Tab Component Render */}
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
                                handlePreviewBill={handleDownloadInvoice}
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

                        {activeTab === 'bulk_bookings' && (
                            <BulkBookingsTab 
                                allRooms={bookingData.rooms || []}
                                isRoomAvailableForDates={isRoomAvailableForDates}
                            />
                        )}

                        {activeTab === 'payments' && (
                            <PaymentsTab
                                onBillGenerated={handleDownloadInvoice}
                            />
                        )}
                        {activeTab === 'enquiry' && (
                            <div className="space-y-6">
                                <RoomMatrixTab 
                                    allRooms={bookingData.rooms} 
                                    isRoomAvailableForDates={isRoomAvailableForDates} 
                                />
                                <BookingSearchTab 
                                    onViewDetails={(id) => setViewBookingId(id)}
                                />
                            </div>
                        )}
                        {activeTab === 'stay_register' && (
                            <StayRegisterTab />
                        )}
                    </div>
                </main>
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
            
            {viewBookingId && (
                <BookingDetailsModal 
                    bookingId={viewBookingId} 
                    onClose={() => setViewBookingId(null)} 
                />
            )}

            <CheckedOutLedgerModal 
                isOpen={!!checkedOutLedgerData}
                onClose={() => setCheckedOutLedgerData(null)}
                data={checkedOutLedgerData}
                onDownloadInvoice={handleDownloadInvoice}
            />
        </div>
    );
}
