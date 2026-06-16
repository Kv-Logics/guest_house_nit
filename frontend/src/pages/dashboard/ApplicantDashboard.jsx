import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { LayoutDashboard, FileText, PlusCircle, Eye, Trash2, Info, RefreshCw, AlertTriangle, CalendarClock, Search, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import PaymentProofModal from '../../components/ui/PaymentProofModal';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import { getFormattedBookingId } from '../../utils/booking';
import ApplicantBulkBookingsTab from '../../components/applicant/bulk_booking/ApplicantBulkBookingsTab';

const MS_DAY = 1000 * 60 * 60 * 24;
/** In dev, warn when departure is this soon (so short seeded stays surface the banner). Prod keeps 24h. */
const DEPARTURE_WARNING_MS =
    import.meta.env.VITE_DEPARTURE_WARNING_MINUTES != null && import.meta.env.VITE_DEPARTURE_WARNING_MINUTES !== ''
        ? Math.max(60000, Number(import.meta.env.VITE_DEPARTURE_WARNING_MINUTES) * 60 * 1000)
        : import.meta.env.PROD
            ? MS_DAY
            : 3 * 60 * 1000;

function stayDepartureAlert(booking) {
    if (booking.booking_state !== 'CHECKED_IN') return null;
    const dep = new Date(booking.departure_datetime).getTime();
    const now = Date.now();
    if (now > dep) return 'overdue';
    if (dep - now <= DEPARTURE_WARNING_MS) return 'warning';
    return null;
}

function extensionAwaitingApproval(booking) {
    return booking.stay_extension_requests?.some(e => ['PENDING', 'PENDING_AUTHORITY', 'PENDING_ADMIN'].includes(e.status));
}

export default function ApplicantDashboard() {
    const [previewId, setPreviewId] = useState(null);
    const [extendModalId, setExtendModalId] = useState(null);
    const [guestExtensions, setGuestExtensions] = useState({});
    const [paymentModalBooking, setPaymentModalBooking] = useState(null);
    const [qrModalBooking, setQrModalBooking] = useState(null);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleNotifications, setVisibleNotifications] = useState(20);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showImportantNotices, setShowImportantNotices] = useState(false);
    
    // System Configurations
    const [sysConfig, setSysConfig] = useState({ enable_extend_stay_applicant: true, show_invoice_applicant: true });
    useEffect(() => {
        try {
            const configStr = localStorage.getItem('sys-config');
            if (configStr) setSysConfig(JSON.parse(configStr));
            
            const handleConfigUpdate = () => {
                const updatedStr = localStorage.getItem('sys-config');
                if (updatedStr) setSysConfig(JSON.parse(updatedStr));
            };
            window.addEventListener('sys-config-updated', handleConfigUpdate);
            return () => window.removeEventListener('sys-config-updated', handleConfigUpdate);
        } catch (e) {
            // ignore error
        }
    }, []);

    // Admins and authorities may need to visit the dashboard to manage their own applications.
    // Default redirects upon login are now handled in LoginPage.

    const cancelMutation = useMutation({
        mutationFn: (id) => bookingService.cancelBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
        },
        onError: (error) => {
            alert(error?.message || error?.response?.data?.message || 'Failed to cancel the booking. It may have already been processed or approved.');
        }
    });

    const extendMutation = useMutation({
        mutationFn: ({ id, guest_extensions }) => bookingService.requestStayExtension(id, guest_extensions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
            setExtendModalId(null);
            setGuestExtensions({});
        },
        onError: (error) => {
            alert(error?.response?.data?.message || error?.message || 'Failed to submit stay extension request.');
        }
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['myBookings'],
        queryFn: bookingService.getMyBookings
    });


    const handleReapply = (bookingId) => {
        navigate(`/book?edit=${bookingId}`);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading your applications...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">Failed to load applications.</div>;

    const bookings = data?.data || [];

    // Compute Active and Past bookings
    const pastStates = ['CANCELLED', 'CHECKED_OUT', 'ADMIN_REJECTED', 'APPROVER_REJECTED'];
    const activeBookings = bookings.filter(b => !pastStates.includes(b.booking_state));
    const pastBookings = bookings.filter(b => pastStates.includes(b.booking_state));

    const displayedBookings = (activeTab === 'active' ? activeBookings : pastBookings).filter(b => {
        const term = searchTerm.toLowerCase();
        return b.booking_id.toLowerCase().includes(term) || (b.guests && b.guests.some(g => g.guest_name && g.guest_name.toLowerCase().includes(term)));
    });

    const hasDepartureOverdue = activeBookings.some((b) => stayDepartureAlert(b) === 'overdue');
    const hasDepartureWarning = activeBookings.some((b) => stayDepartureAlert(b) === 'warning');
    const extendTarget = extendModalId ? bookings.find((b) => b.booking_id === extendModalId) : null;

    const submitExtend = () => {
        const payload = [];
        
        // Only include checked-in guests who have a new date selected that is after their current departure
        for (const guest of (extendTarget.guests || []).filter(g => g.stay_status === 'CHECKED_IN')) {
            const extTime = guestExtensions[guest.guest_id];
            if (!extTime) continue;
            
            const currentDep = new Date(guest.expected_departure || extendTarget.departure_datetime);
            const selected = new Date(extTime);
            
            if (selected <= currentDep) continue; // Skip if not actually extended
            
            payload.push({ guest_id: guest.guest_id, new_departure_datetime: selected.toISOString() });
        }
        
        if (payload.length === 0) {
            alert('Please select a new departure date (after the current checkout) for at least one checked-in guest.');
            return;
        }
        extendMutation.mutate({ id: extendModalId, guest_extensions: payload });
    };

    const activeNotifications = activeBookings.filter(b => ['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'APPROVER_REJECTED', 'ADMIN_REJECTED'].includes(b.booking_state));
    const showFinalChargesNotice = activeBookings.some(b => b.booking_state === 'CHECKED_IN' && b.allocated_room_numbers);
    const showDepartureOverdueNotice = activeBookings.length > 0 && hasDepartureOverdue;
    const showDepartureWarningNotice = activeBookings.length > 0 && !hasDepartureOverdue && hasDepartureWarning;
    const showWithdrawalNotice = user && ![ROLES.STUDENT, ROLES.RECEPTIONIST].includes(user.role) && activeTab !== 'bulk';
    const hasAnyNotices = showFinalChargesNotice || showDepartureOverdueNotice || showDepartureWarningNotice || showWithdrawalNotice;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Applications</h2>
                        <p className="text-slate-500 font-medium">
                            Welcome, {user?.faculty_name || user?.full_name || user?.email?.split('@')[0]} | Track your guest house booking requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Manage Request Stats */}
            {bookings.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Pending — With Authority', count: bookings.filter(b => b.booking_state === 'PENDING_APPROVER').length, color: 'amber' },
                        { label: 'Pending — With GH Chair', count: bookings.filter(b => b.booking_state === 'PENDING_ADMIN').length, color: 'blue' },
                        { label: 'Approved / Ready', count: bookings.filter(b => ['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN'].includes(b.booking_state)).length, color: 'green' },
                        { label: 'Rejected', count: bookings.filter(b => ['APPROVER_REJECTED', 'ADMIN_REJECTED'].includes(b.booking_state)).length, color: 'red' },
                    ].map(({ label, count, color }) => (
                        <div key={label} className={`rounded-2xl border px-4 py-3 shadow-sm flex flex-col gap-1 ${
                            color === 'amber' ? 'bg-amber-50 border-amber-200' :
                            color === 'blue'  ? 'bg-blue-50 border-blue-200' :
                            color === 'green' ? 'bg-emerald-50 border-emerald-200' :
                                                'bg-red-50 border-red-200'
                        }`}>
                            <span className={`text-2xl font-black ${
                                color === 'amber' ? 'text-amber-700' :
                                color === 'blue'  ? 'text-blue-700' :
                                color === 'green' ? 'text-emerald-700' :
                                                    'text-red-700'
                            }`}>{count}</span>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                color === 'amber' ? 'text-amber-600' :
                                color === 'blue'  ? 'text-blue-600' :
                                color === 'green' ? 'text-emerald-600' :
                                                    'text-red-600'
                            }`}>{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Notifications Box (Collapsible) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-full bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800">Recent Notifications {activeNotifications.length > 0 && `(${activeNotifications.length})`}</h3>
                    </div>
                    <div className="text-sm font-bold text-slate-400">
                        {showNotifications ? 'Hide' : 'Click to open'}
                    </div>
                </button>
                
                {showNotifications && (
                    <div className="p-5 max-h-64 overflow-y-auto space-y-3">
                        {activeNotifications.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No new notifications.</p>
                        ) : (
                            <>
                                {activeNotifications.slice(0, visibleNotifications).map(b => (
                                    <div key={b.booking_id} className={`p-3 rounded-xl border text-sm font-medium ${
                                        b.booking_state.includes('REJECTED') ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                    }`}>
                                        Application <span className="font-bold font-mono">{getFormattedBookingId(b)}</span> has been {b.booking_state.includes('REJECTED') ? 'rejected' : 'approved and is ready'}.
                                    </div>
                                ))}
                                {visibleNotifications < activeNotifications.length && (
                                    <button 
                                        onClick={() => setVisibleNotifications(prev => prev + 20)}
                                        className="w-full mt-2 py-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                                    >
                                        View More Notifications ({activeNotifications.length - visibleNotifications} remaining)
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Important Notices (Collapsible) */}
            {hasAnyNotices && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
                    <button 
                        onClick={() => setShowImportantNotices(!showImportantNotices)}
                        className={`w-full bg-slate-50 px-5 py-3 flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors ${showImportantNotices ? 'border-b border-slate-100' : ''}`}
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-bold text-slate-800">Important Notices</h3>
                        </div>
                        <div className="text-sm font-bold text-slate-400">
                            {showImportantNotices ? 'Hide' : 'Click to open'}
                        </div>
                    </button>
                    
                    {showImportantNotices && (
                        <div className="p-5 space-y-3 bg-white">
                            {showFinalChargesNotice && (
                                <div className="bg-indigo-50 p-4 rounded-xl text-sm font-semibold text-indigo-900 leading-relaxed border border-indigo-200 flex items-start shadow-sm">
                                    <Info className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-indigo-500" />
                                    <span className="text-left">Final charges are based on actual room usage assigned during your stay. Any receptionist overrides may affect the final invoice amount.</span>
                                </div>
                            )}

                            {showDepartureOverdueNotice && (
                                <div className="bg-rose-50 p-4 rounded-xl text-sm font-semibold text-rose-900 leading-relaxed border border-rose-200 flex items-start shadow-sm">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-rose-600" />
                                    <span className="text-left">
                                        Scheduled departure time has passed for at least one checked-in stay. Request a stay extension if guests need to remain longer; approvals follow the same route as a new booking.
                                    </span>
                                </div>
                            )}

                            {showDepartureWarningNotice && (
                                <div className="bg-amber-50 p-4 rounded-xl text-sm font-semibold text-amber-950 leading-relaxed border border-amber-200 flex items-start shadow-sm">
                                    <CalendarClock className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-amber-600" />
                                    <span className="text-left">
                                        A checked-in booking reaches scheduled departure within {import.meta.env.PROD ? '24 hours' : 'a few minutes (dev)'}. Submit an extension early if you need more nights.
                                    </span>
                                </div>
                            )}

                            {showWithdrawalNotice && (
                                <div className="bg-blue-50/80 p-4 rounded-xl text-sm font-semibold text-indigo-800 leading-relaxed border border-blue-100 flex items-start shadow-sm">
                                    <Info className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-blue-500" />
                                    <span className="text-left">Withdrawal Notice: If your plans have changed, you may withdraw your pending application at any time using the &quot;Withdraw&quot; action next to the booking preview.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button onClick={() => setActiveTab('active')} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Active Stays
                    </button>
                    <button onClick={() => setActiveTab('past')} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Past / Closed
                    </button>
                    <button onClick={() => setActiveTab('bulk')} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Bulk Bookings
                    </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Search by ID or Guest Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {activeTab === 'bulk' ? (
                <ApplicantBulkBookingsTab />
            ) : displayedBookings.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No {activeTab === 'active' ? 'Active' : 'Past'} Bookings Found</h3>
                    <p className="text-slate-500 mb-6">You have not submitted any accommodation requests yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-bold">Booking ID</th>
                                <th className="p-4 font-bold">Guests</th>
                                <th className="p-4 font-bold">Arrival</th>
                                <th className="p-4 font-bold">Departure</th>
                                <th className="p-4 font-bold">Rooms</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedBookings.map(b => (
                                <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-mono text-xs text-slate-500 font-bold">{getFormattedBookingId(b)}</p>
                                        {b.version > 1 && (
                                            <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">v{b.version} Re-applied</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-slate-800 truncate max-w-[150px]" title={b.guests && b.guests.length > 0 ? b.guests.map(g => g.guest_name).join(', ') : 'N/A'}>
                                            {b.guests && b.guests.length > 0 ? b.guests[0].guest_name : 'N/A'}
                                        </div>
                                        <div className="text-xs text-slate-500">{b.guests?.length || 0} Guest(s)</div>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{new Date(b.arrival_datetime).toLocaleDateString()}</td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{new Date(b.departure_datetime).toLocaleDateString()}</td>
                                    <td className="p-4 text-sm font-medium text-slate-800">
                                        <div>{b.rooms_required} Room{b.rooms_required > 1 ? 's' : ''}</div>
                                        {b.allocated_room_numbers && (
                                            <div className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                                                {b.allocated_room_numbers}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={b.booking_state} />
                                        {extensionAwaitingApproval(b) && (
                                            <p className="text-xs text-violet-700 mt-1.5 font-bold bg-violet-50 px-2 py-1 rounded inline-block border border-violet-100">
                                                Stay extension awaiting approval
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        {(() => {
                                            const showPaymentBtn = Number(b.total_estimated_amount) > 0 &&
                                                b.payment_responsible !== 'institute' &&
                                                !['DRAFT', 'CANCELLED', 'ADMIN_REJECTED', 'APPROVER_REJECTED'].includes(b.booking_state);
                                            return showPaymentBtn && (
                                                <button
                                                    onClick={() => setPaymentModalBooking(b)}
                                                    className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors ${b.payment_state === 'PAID' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200' : b.payment_state.includes('PROOF') || b.payment_state === 'UNDER_REVIEW' ? 'bg-blue-600 text-white hover:bg-blue-700' : b.payment_state === 'REJECTED' || b.payment_state.includes('WARNING') ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                                >
                                                    {b.payment_state === 'PAID' ? 'View Payment' : b.payment_state.includes('PROOF') || b.payment_state === 'UNDER_REVIEW' ? 'Proof Under Review' : 'Upload Payment Proof'}
                                                </button>
                                            );
                                        })()}
                                        {['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN'].includes(b.booking_state) && (
                                            <button onClick={() => setQrModalBooking(b)} className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm ml-2">
                                                <Download className="w-4 h-4 mr-1.5" /> QR Pass
                                            </button>
                                        )}
                                        <button onClick={() => setPreviewId(b.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm ml-2">
                                            <Eye className="w-4 h-4 mr-1.5" /> Preview
                                        </button>
                                        {['PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED', 'READY_FOR_CHECKIN'].includes(b.booking_state) && !(b.checked_in_at && b.pending_extension_datetime) && (
                                            <button
                                                onClick={() => { if (window.confirm('Are you sure you want to withdraw this application?')) cancelMutation.mutate(b.booking_id); }}
                                                disabled={cancelMutation.isPending}
                                                className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-lg transition-colors shadow-sm ml-2"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Withdraw
                                            </button>
                                        )}
                                        {sysConfig.enable_extend_stay_applicant && b.booking_state === 'CHECKED_IN' && !extensionAwaitingApproval(b) && (
                                            <button
                                                type="button"
                                                onClick={() => { 
                                                    setExtendModalId(b.booking_id); 
                                                    const initialExts = {};
                                                    b.guests?.forEach(g => {
                                                        initialExts[g.guest_id] = new Date(g.expected_departure || b.departure_datetime).toISOString().slice(0, 16);
                                                    });
                                                    setGuestExtensions(initialExts);
                                                }}
                                                className="inline-flex items-center px-3 py-1.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-lg hover:bg-teal-100 border border-teal-200 transition-colors shadow-sm ml-2"
                                            >
                                                <CalendarClock className="w-4 h-4 mr-1.5" /> Extend stay
                                            </button>
                                        )}
                                        {sysConfig.show_invoice_applicant && b.booking_state === 'CHECKED_OUT' && Number(b.category_id) !== 1 && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await bookingService.downloadInvoice(b.booking_id);
                                                        const blob = new Blob([res], { type: 'application/pdf' });
                                                        const url = window.URL.createObjectURL(blob);
                                                        const formattedId = getFormattedBookingId(b).replace(/[/:]/g, '_').toUpperCase();
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', `invoice-${formattedId}.pdf`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        link.parentNode.removeChild(link);
                                                    } catch (err) {
                                                        const errMsg = err.response?.data?.error || err.message || 'Failed to download invoice';
                                                        alert(errMsg);
                                                    }
                                                }}
                                                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm ml-2"
                                            >
                                                <FileText className="w-4 h-4 mr-1.5" /> Invoice
                                            </button>
                                        )}
                                        {((['PENDING_APPROVER', 'APPROVER_REJECTED', 'ADMIN_REJECTED', 'DRAFT'].includes(b.booking_state)) || (b.booking_state === 'PENDING_ADMIN' && String(b.category_id) === '3' && user?.role === 'faculty')) && (
                                            <button
                                                onClick={() => handleReapply(b.booking_id)}
                                                className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors shadow-sm ml-2">
                                                <RefreshCw className="w-4 h-4 mr-1.5" /> Edit Application
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {previewId && <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />}

            {paymentModalBooking && <PaymentProofModal booking={paymentModalBooking} onClose={() => setPaymentModalBooking(null)} />}

            {extendModalId && extendTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="extend-stay-title">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fade-in">
                        <h3 id="extend-stay-title" className="text-lg font-extrabold text-slate-800 tracking-tight mb-1">Extend stay</h3>
                        <p className="text-sm text-slate-500 font-medium mb-4">
                            Booking <span className="font-mono text-xs font-bold">{getFormattedBookingId(extendTarget)}</span> — add nights after the current scheduled departure. This will be sent for the same approver and admin review as a new application.
                            <br /><br />Current Departure: <strong className="text-slate-800">{new Date(extendTarget.departure_datetime).toLocaleString()}</strong>
                        </p>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Select Guests to Extend & New Departure</label>
                        <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                            {(extendTarget.guests || []).filter(g => g.stay_status === 'CHECKED_IN').length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No checked-in guests found for this booking.</p>
                            ) : (
                                (extendTarget.guests || []).filter(g => g.stay_status === 'CHECKED_IN').map(g => (
                                    <div key={g.guest_id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-slate-800 text-sm">{g.guest_name}</span>
                                            <span className="text-xs text-slate-500">Current: {new Date(g.expected_departure || extendTarget.departure_datetime).toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="datetime-local"
                                            value={guestExtensions[g.guest_id] || ''}
                                            min={new Date(g.expected_departure || extendTarget.departure_datetime).toISOString().slice(0, 16)}
                                            onChange={(e) => setGuestExtensions(prev => ({ ...prev, [g.guest_id]: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => { setExtendModalId(null); setGuestExtensions({}); }}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                                disabled={extendMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitExtend}
                                disabled={extendMutation.isPending}
                                className="px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm disabled:opacity-50"
                            >
                                {extendMutation.isPending ? 'Submitting…' : 'Submit for approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {qrModalBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="qr-pass-title">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-8 animate-fade-in text-center">
                        <div className="flex justify-between items-center mb-6">
                            <h3 id="qr-pass-title" className="text-xl font-black text-slate-800 tracking-tight">Application QR Pass</h3>
                            <button onClick={() => setQrModalBooking(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center gap-6 shadow-inner mb-6">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <QRCodeCanvas id="qr-pass-canvas" value={getFormattedBookingId(qrModalBooking)} size={160} level="M" includeMargin={true} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600 font-medium mb-3">
                                    Share this QR code with your guests. They can show it at Reception or to the Guest House Coordinator for instant check-in.
                                </p>
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 inline-flex items-center gap-3 font-mono text-sm shadow-sm">
                                    <span className="text-slate-400 font-bold">ID:</span>
                                    <span className="font-bold text-slate-800">{getFormattedBookingId(qrModalBooking)}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const canvas = document.getElementById('qr-pass-canvas');
                                if (canvas) {
                                    const url = canvas.toDataURL('image/png');
                                    const link = document.createElement('a');
                                    link.download = `QR_Pass_${getFormattedBookingId(qrModalBooking).replace(/\//g, '_')}.png`;
                                    link.href = url;
                                    link.click();
                                }
                            }}
                            className="w-full py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                        >
                            <Download className="w-5 h-5" /> Download Pass
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
