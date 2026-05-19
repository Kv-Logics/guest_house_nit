import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receptionService } from '../../services/reception.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { Key, UserCheck, Clock, Search, Eye, FileText, BedDouble, Brush, Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import GSTInvoiceModal from '../../pages/booking/GSTInvoiceModal';

export default function ReceptionDashboard() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('arrivals');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewId, setPreviewId] = useState(null);
    const [checkInModal, setCheckInModal] = useState({ isOpen: false, id: null });
    const [roomNumbers, setRoomNumbers] = useState('');
    const [invoiceBookingId, setInvoiceBookingId] = useState(null);

    // Extension Stay Modal state
    const [extensionModal, setExtensionModal] = useState({ isOpen: false, bookingId: null, currentDeparture: '', newDeparture: '' });

    // History Modal state
    const [historyModal, setHistoryModal] = useState({ isOpen: false, roomNumber: '', history: [] });

    // Live clock state to keep the countdown ticking
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Query 1: Expected arrivals and active stays (Today arrivals)
    const { data: arrivalsRes, isLoading: isArrivalsLoading } = useQuery({
        queryKey: ['receptionArrivals'],
        queryFn: receptionService.getTodayArrivals
    });

    // Query 2: Rooms list with occupancy, guests, and stay histories
    const { data: roomsRes, isLoading: isRoomsLoading } = useQuery({
        queryKey: ['receptionRooms'],
        queryFn: receptionService.getRooms
    });

    const checkInMutation = useMutation({
        mutationFn: ({ id, rooms }) => receptionService.checkIn(id, rooms),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receptionArrivals'] });
            queryClient.invalidateQueries({ queryKey: ['receptionRooms'] });
            setCheckInModal({ isOpen: false, id: null });
            setRoomNumbers('');
        }
    });

    const checkOutMutation = useMutation({
        mutationFn: (id) => receptionService.checkOut(id),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['receptionArrivals'] });
            queryClient.invalidateQueries({ queryKey: ['receptionRooms'] });
            setInvoiceBookingId(variables); // Auto-open GST Invoice
        }
    });

    const updateRoomStatusMutation = useMutation({
        mutationFn: ({ roomNumber, status }) => receptionService.updateRoomStatus(roomNumber, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receptionRooms'] });
        },
        onError: (err) => {
            alert(err?.message || 'Failed to update room status.');
        }
    });

    const extendStayMutation = useMutation({
        mutationFn: ({ bookingId, departureDatetime }) => receptionService.extendStay(bookingId, departureDatetime),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receptionRooms'] });
            queryClient.invalidateQueries({ queryKey: ['receptionArrivals'] });
            setExtensionModal({ isOpen: false, bookingId: null, currentDeparture: '', newDeparture: '' });
        },
        onError: (err) => {
            alert(err?.message || 'Failed to extend stay.');
        }
    });

    const handleCheckOut = (b) => {
        if (String(b.category_id) === '3' && b.payment_state !== 'PAID') {
            alert('CAT-III bookings must be marked as PAID before Check-Out. Please collect payment and update the status in the Admin dashboard.');
            return;
        }
        if (window.confirm('Are you sure you want to Check Out this guest?')) {
            checkOutMutation.mutate(b.booking_id);
        }
    };

    const handleToggleCleaning = (roomNumber, currentStatus) => {
        const nextStatus = currentStatus === 'cleaning' ? 'available' : 'cleaning';
        updateRoomStatusMutation.mutate({ roomNumber, status: nextStatus });
    };

    const handleOpenExtension = (booking) => {
        setExtensionModal({
            isOpen: true,
            bookingId: booking.booking_id,
            currentDeparture: new Date(booking.departure_datetime).toISOString().slice(0, 16),
            newDeparture: new Date(booking.departure_datetime).toISOString().slice(0, 16)
        });
    };

    if (isArrivalsLoading || isRoomsLoading) {
        return <div className="p-8 text-center text-slate-500 font-bold">Loading Front Desk data...</div>;
    }

    const arrivals = arrivalsRes?.data || [];
    const rooms = roomsRes?.data || [];

    // Filter arrivals
    const displayedArrivals = arrivals.filter(b => {
        const term = searchTerm.toLowerCase();
        return b.booking_id.toLowerCase().includes(term) || 
               (b.guest_names && b.guest_names.toLowerCase().includes(term)) || 
               (b.applicant_name && b.applicant_name.toLowerCase().includes(term));
    });

    // Filter rooms by status/category
    const bookedRooms = rooms.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesTerm = r.room_number.includes(term) || 
                            (r.active_booking && (
                                r.active_booking.applicant_name.toLowerCase().includes(term) ||
                                r.active_booking.guests.some(g => g.guest_name.toLowerCase().includes(term))
                            ));
        return r.current_status === 'occupied' && matchesTerm;
    });

    const availableRooms = rooms.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesTerm = r.room_number.includes(term) || r.room_type.toLowerCase().includes(term);
        return ['available', 'reserved'].includes(r.current_status) && matchesTerm;
    });

    const cleaningRooms = rooms.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesTerm = r.room_number.includes(term) || r.room_type.toLowerCase().includes(term);
        return ['cleaning', 'maintenance'].includes(r.current_status) && matchesTerm;
    });

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl shadow-sm border border-teal-100">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Front Desk</h2>
                        <p className="text-slate-500 font-medium">Manage approved guests, daily check-ins, and active stays</p>
                    </div>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search rooms, guests, applicants..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" 
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-6 gap-2">
                <button
                    onClick={() => setActiveTab('arrivals')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all border-b-2 ${
                        activeTab === 'arrivals'
                            ? 'border-teal-600 text-teal-600 bg-teal-50/40'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <UserCheck className="w-4 h-4" /> Arrivals & Stays
                </button>
                <button
                    onClick={() => setActiveTab('booked')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all border-b-2 ${
                        activeTab === 'booked'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <BedDouble className="w-4 h-4" /> Booked Rooms
                </button>
                <button
                    onClick={() => setActiveTab('available')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all border-b-2 ${
                        activeTab === 'available'
                            ? 'border-emerald-600 text-emerald-600 bg-emerald-50/40'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <CheckCircle2 className="w-4 h-4" /> Available Rooms
                </button>
                <button
                    onClick={() => setActiveTab('cleaning')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-t-xl transition-all border-b-2 ${
                        activeTab === 'cleaning'
                            ? 'border-amber-600 text-amber-600 bg-amber-50/40'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Brush className="w-4 h-4" /> Room Cleaning
                </button>
            </div>

            {/* TAB 1: ARRIVALS & STAYS */}
            {activeTab === 'arrivals' && (
                displayedArrivals.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Nothing on the board</h3>
                        <p className="text-slate-500">No matching arrivals or active stays found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="p-4 font-bold">Booking ID</th>
                                    <th className="p-4 font-bold">Guest(s) & Applicant</th>
                                    <th className="p-4 font-bold">Dates</th>
                                    <th className="p-4 font-bold">Rooms</th>
                                    <th className="p-4 font-bold">Status</th>
                                    <th className="p-4 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedArrivals.map(b => (
                                    <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-xs text-slate-500">{b.booking_id.split('-')[0]}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2"><p className="font-bold text-slate-800">{b.guest_names || 'No Guests Listed'}</p></div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-500">Booked by: {b.applicant_name}</p>
                                                {b.version > 1 && <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">v{b.version} Re-applied</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-800">
                                            <p>{new Date(b.arrival_datetime).toLocaleDateString()} - {new Date(b.departure_datetime).toLocaleDateString()}</p>
                                            <p className="text-xs text-slate-500 font-bold mt-0.5">{(() => {
                                                const dMs = new Date(b.departure_datetime) - new Date(b.arrival_datetime);
                                                const dDays = Math.floor(dMs / (1000 * 60 * 60 * 24));
                                                const dHrs = Math.floor((dMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                return (dDays > 0 && dHrs > 0) ? `${dDays}d ${dHrs}h` : dDays > 0 ? `${dDays} Days` : `${dHrs} Hours`;
                                            })()}</p>
                                            {b.checked_in_at && (
                                                <div className="mt-1 text-[10px] text-slate-400 font-bold">
                                                    In: {new Date(b.checked_in_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                            )}
                                            {b.checked_out_at && (
                                                <div className="mt-0.5 text-[10px] text-slate-400 font-bold">
                                                    Out: {new Date(b.checked_out_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                            )}
                                            {b.allocated_room_numbers && (
                                                <div className="mt-1 font-bold text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5 inline-block">
                                                    Room: {b.allocated_room_numbers}
                                                </div>
                                            )}
                                            {(b.booking_state === 'CHECKED_IN' || b.is_extension_pending) && (
                                                <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-md border shadow-sm text-[10px] font-bold ${
                                                    new Date(b.departure_datetime) < now
                                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                }`}>
                                                    <Clock className="w-3 h-3 mr-1.5" />
                                                    {(() => {
                                                        const diffMs = new Date(b.departure_datetime) - now;
                                                        const isOverdue = diffMs < 0;
                                                        const absMs = Math.abs(diffMs);
                                                        const d = Math.floor(absMs / (1000 * 60 * 60 * 24));
                                                        const h = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                        const m = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
                                                        const parts = [];
                                                        if (d > 0) parts.push(`${d}d`);
                                                        if (d > 0 || h > 0) parts.push(`${h}h`);
                                                        parts.push(`${m}m`);
                                                        return isOverdue ? `Overdue by ${parts.join(' ')}` : `${parts.join(' ')} left`;
                                                    })()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-800">{b.rooms_required} x {b.room_type}</td>
                                        <td className="p-4">
                                            <StatusBadge status={b.booking_state} />
                                            {b.is_extension_pending && (
                                                <p className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1 mt-2 inline-block max-w-[14rem] leading-snug">
                                                    Guest in-house — Stay extension pending approval
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button 
                                                onClick={() => setPreviewId(b.booking_id)}
                                                className="px-3 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {['ADMIN_APPROVED', 'READY_FOR_CHECKIN'].includes(b.booking_state) && (
                                                <button 
                                                    onClick={() => setCheckInModal({ isOpen: true, id: b.booking_id })} 
                                                    className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                            {(b.booking_state === 'CHECKED_IN' || b.is_extension_pending) && (
                                                <button 
                                                    onClick={() => handleCheckOut(b)} 
                                                    disabled={checkOutMutation.isPending}
                                                    className="px-4 py-2 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
                                                >
                                                    {checkOutMutation.isPending ? 'Processing...' : 'Check Out'}
                                                </button>
                                            )}
                                            {b.booking_state === 'CHECKED_OUT' && (
                                                <button 
                                                    onClick={() => setInvoiceBookingId(b.booking_id)} 
                                                    className="px-3 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors shadow-sm border border-blue-200"
                                                    title="Download Bill"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* TAB 2: BOOKED ROOMS */}
            {activeTab === 'booked' && (
                bookedRooms.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <BedDouble className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Booked Rooms</h3>
                        <p className="text-slate-500">There are currently no rooms marked as occupied.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {bookedRooms.map(room => (
                            <div key={room.room_id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-lg font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3.5 py-1 rounded-xl">Room {room.room_number}</span>
                                        <span className={`text-xs uppercase tracking-wider font-extrabold px-2.5 py-1 bg-indigo-600 text-white rounded-lg`}>{room.room_type} Occupancy</span>
                                    </div>
                                    <div className="space-y-3 mb-6">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Booking ID</p>
                                            <p className="text-xs font-mono text-slate-600">{room.active_booking?.booking_id.split('-')[0]} ({room.active_booking?.applicant_name})</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Guests</p>
                                            <div className="space-y-1 mt-1">
                                                {room.active_booking?.guests.map(g => (
                                                    <div key={g.guest_id} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 flex justify-between">
                                                        <span>{g.guest_name}</span>
                                                        <span className="text-slate-400 text-[10px]">{g.relation}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Check In</p>
                                                <p className="font-semibold text-slate-700">{new Date(room.active_booking?.arrival_datetime).toLocaleDateString()} {new Date(room.active_booking?.arrival_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Check Out</p>
                                                <p className="font-semibold text-slate-700">{new Date(room.active_booking?.departure_datetime).toLocaleDateString()} {new Date(room.active_booking?.departure_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        {room.active_booking?.extra_beds > 0 && (
                                            <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-lg p-2 text-xs font-bold flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-2" /> Extra Bed requested for stay
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenExtension(room.active_booking)}
                                        className="flex-1 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" /> Extend Stay
                                    </button>
                                    <button
                                        onClick={() => setPreviewId(room.active_booking.booking_id)}
                                        className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 shadow-sm"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* TAB 3: AVAILABLE ROOMS */}
            {activeTab === 'available' && (
                availableRooms.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Available Rooms</h3>
                        <p className="text-slate-500">Every single room is currently occupied or undergoing maintenance.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {availableRooms.map(room => (
                            <div key={room.room_id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-base font-extrabold text-slate-800">Room {room.room_number}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg border ${
                                            room.current_status === 'reserved'
                                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>{room.current_status}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 capitalize mb-1">Type: <strong>{room.room_type}</strong></p>
                                    <p className="text-xs text-slate-500 mb-4">Floor: <strong>{room.floor_number}</strong> | Block: <strong>{room.block_name}</strong></p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleCleaning(room.room_number, 'available')}
                                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Set Cleaning
                                    </button>
                                    <button
                                        onClick={() => setHistoryModal({ isOpen: true, roomNumber: room.room_number, history: room.history || [] })}
                                        className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        title="Stay History"
                                    >
                                        Stays ({room.history?.length || 0})
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* TAB 4: ROOM CLEANING */}
            {activeTab === 'cleaning' && (
                cleaningRooms.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <Brush className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Rooms in Cleaning</h3>
                        <p className="text-slate-500">Excellent! All rooms are clean and ready for guest allocation.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cleaningRooms.map(room => (
                            <div key={room.room_id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-base font-extrabold text-slate-800">Room {room.room_number}</span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg border bg-rose-50 text-rose-700 border-rose-100">Cleaning</span>
                                    </div>
                                    <p className="text-xs text-slate-500 capitalize mb-1">Type: <strong>{room.room_type}</strong></p>
                                    <p className="text-xs text-slate-500 mb-4">Floor: <strong>{room.floor_number}</strong> | Block: <strong>{room.block_name}</strong></p>
                                </div>
                                <button
                                    onClick={() => handleToggleCleaning(room.room_number, 'cleaning')}
                                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                >
                                    Finish Cleaning
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* DETAILS PREVIEW MODAL */}
            {previewId && <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />}

            {/* CHECK-IN MODAL */}
            {checkInModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200">
                        <h3 className="text-xl font-extrabold text-slate-800 mb-2">Check-In Guest</h3>
                        <p className="text-sm text-slate-500 mb-6">Assign physical room numbers for this booking.</p>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Allocated Room No(s) *</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 101, 102" 
                                value={roomNumbers} 
                                onChange={e => setRoomNumbers(e.target.value)} 
                                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setCheckInModal({ isOpen: false, id: null }); setRoomNumbers(''); }} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button 
                                onClick={() => checkInMutation.mutate({ id: checkInModal.id, rooms: roomNumbers })} 
                                disabled={!roomNumbers.trim() || checkInMutation.isPending}
                                className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {checkInMutation.isPending ? 'Processing...' : 'Confirm Check-In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXTEND STAY MODAL */}
            {extensionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 animate-slide-up">
                        <h3 className="text-xl font-extrabold text-slate-800 mb-2">Extend Guest Stay</h3>
                        <p className="text-sm text-slate-500 mb-6">Update the checkout departure date and time for this stay.</p>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Current Departure</label>
                                <input 
                                    type="datetime-local" 
                                    value={extensionModal.currentDeparture} 
                                    disabled 
                                    className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl p-3 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Departure Date & Time *</label>
                                <input 
                                    type="datetime-local" 
                                    value={extensionModal.newDeparture} 
                                    onChange={e => setExtensionModal(prev => ({ ...prev, newDeparture: e.target.value }))} 
                                    className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setExtensionModal({ isOpen: false, bookingId: null, currentDeparture: '', newDeparture: '' })} 
                                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => extendStayMutation.mutate({ bookingId: extensionModal.bookingId, departureDatetime: extensionModal.newDeparture })} 
                                disabled={!extensionModal.newDeparture || extendStayMutation.isPending}
                                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {extendStayMutation.isPending ? 'Saving...' : 'Extend Stay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STAY HISTORY MODAL */}
            {historyModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-slate-800">Stay History: Room {historyModal.roomNumber}</h3>
                            <button 
                                onClick={() => setHistoryModal({ isOpen: false, roomNumber: '', history: [] })}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                        
                        {historyModal.history.length === 0 ? (
                            <p className="text-sm text-slate-500 py-6 text-center">No past stay logs recorded for this room.</p>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                                {historyModal.history.map((log, index) => (
                                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <p className="text-sm font-bold text-slate-800">{log.guest_names || 'Unnamed Guests'}</p>
                                        <p className="text-xs text-slate-500 mt-1">Booking: <span className="font-mono">{log.booking_id.split('-')[0]}</span></p>
                                        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold">
                                            <span>In: {new Date(log.checked_in_at).toLocaleDateString()}</span>
                                            <span>Out: {log.checked_out_at ? new Date(log.checked_out_at).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BILL/INVOICE MODAL */}
            {invoiceBookingId && <GSTInvoiceModal bookingId={invoiceBookingId} onClose={() => setInvoiceBookingId(null)} />}
        </div>
    );
}