import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { LayoutDashboard, FileText, PlusCircle, Eye, Trash2, Info, RefreshCw, AlertTriangle, CalendarClock, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

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
    return (
        Boolean(booking.checked_in_at) &&
        booking.pending_extension_datetime != null &&
        ['PENDING_APPROVER', 'PENDING_ADMIN'].includes(booking.booking_state)
    );
}

export default function ApplicantDashboard() {
    const [previewId, setPreviewId] = useState(null);
    const [extendModalId, setExtendModalId] = useState(null);
    const [extendDatetime, setExtendDatetime] = useState('');
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');

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
        mutationFn: ({ id, new_departure_datetime }) => bookingService.requestStayExtension(id, new_departure_datetime),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
            setExtendModalId(null);
            setExtendDatetime('');
        },
        onError: (error) => {
            alert(error?.message || 'Failed to submit stay extension request.');
        }
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['myBookings'],
        queryFn: bookingService.getMyBookings
    });

    const handleReapply = async (bookingId) => {
        try {
            const response = await bookingService.getBookingById(bookingId);
            const b = response.data;
            const formattedGuests = b.guests ? b.guests.map(g => {
                const arrDate = new Date(g.arrival_datetime);
                const depDate = new Date(g.departure_datetime);
                return {
                    ...g,
                    arrival_date: `${arrDate.getFullYear()}-${String(arrDate.getMonth()+1).padStart(2,'0')}-${String(arrDate.getDate()).padStart(2,'0')}`,
                    arrival_time: `${String(arrDate.getHours()).padStart(2, '0')}:${String(arrDate.getMinutes()).padStart(2, '0')}`,
                    departure_date: `${depDate.getFullYear()}-${String(depDate.getMonth()+1).padStart(2,'0')}-${String(depDate.getDate()).padStart(2,'0')}`,
                    departure_time: `${String(depDate.getHours()).padStart(2, '0')}:${String(depDate.getMinutes()).padStart(2, '0')}`,
                    food_preferences: g.food_preferences ? g.food_preferences.map(f => {
                        const mDate = new Date(f.meal_date || f.date);
                        return {
                            ...f,
                            date: `${mDate.getFullYear()}-${String(mDate.getMonth()+1).padStart(2,'0')}-${String(mDate.getDate()).padStart(2,'0')}`
                        };
                    }) : []
                };
            }) : [];

            // Convert flat guests array back to rooms array (assuming max 2 guests per room)
            const reconstructedRooms = [];
            for (let i = 0; i < formattedGuests.length; i += 2) {
                reconstructedRooms.push({
                    guests: formattedGuests.slice(i, i + 2),
                    extra_bed: false // backend doesn't map beds to specific rooms easily, assume false for reapply to be safe or check b.extra_beds
                });
            }
            if (b.extra_beds > 0 && reconstructedRooms.length > 0) {
                for (let i = 0; i < Math.min(b.extra_beds, reconstructedRooms.length); i++) {
                    reconstructedRooms[i].extra_bed = true;
                }
            }

            const formattedData = {
                ...b,
                category_id: String(b.category_id),
                rooms: reconstructedRooms,
                document_1: null,
                document_2: null
            };
            navigate('/book', { state: { formData: formattedData, isReapply: true } });
        } catch (e) {
            alert('Failed to load booking details for reapplication.');
        }
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
        if (!extendDatetime) {
            alert('Please select a valid date and time for checkout.');
            return;
        }
        const selected = new Date(extendDatetime);
        const currentDep = new Date(extendTarget.departure_datetime);
        if (selected <= currentDep) {
            alert('New departure time must be after your current checkout time.');
            return;
        }
        extendMutation.mutate({ id: extendModalId, new_departure_datetime: selected.toISOString() });
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Applications</h2>
                        <p className="text-slate-500 font-medium">Track your guest house booking requests</p>
                    </div>
                </div>
                <Link to="/book" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                    <PlusCircle className="w-5 h-5" />
                    New Application
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button onClick={() => setActiveTab('active')} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Active Stays
                    </button>
                    <button onClick={() => setActiveTab('past')} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Past / Closed
                    </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Search by ID or Guest Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {activeBookings.length > 0 && hasDepartureOverdue && (
                <div className="bg-rose-50 p-4 rounded-xl text-sm font-semibold text-rose-900 leading-relaxed border border-rose-200 flex items-start mb-6 shadow-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-rose-600" />
                    <span className="text-left">
                        Scheduled departure time has passed for at least one checked-in stay. Request a stay extension if guests need to remain longer; approvals follow the same route as a new booking.
                    </span>
                </div>
            )}
            {activeBookings.length > 0 && !hasDepartureOverdue && hasDepartureWarning && (
                <div className="bg-amber-50 p-4 rounded-xl text-sm font-semibold text-amber-950 leading-relaxed border border-amber-200 flex items-start mb-6 shadow-sm">
                    <CalendarClock className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-amber-600" />
                    <span className="text-left">
                        A checked-in booking reaches scheduled departure within {import.meta.env.PROD ? '24 hours' : 'a few minutes (dev)'}. Submit an extension early if you need more nights.
                    </span>
                </div>
            )}

            {user && ![ROLES.STUDENT, ROLES.RECEPTIONIST].includes(user.role) && (
                <div className="bg-blue-50/80 p-4 rounded-xl text-sm font-semibold text-indigo-800 leading-relaxed border border-blue-100 flex items-start mb-6 shadow-sm">
                    <Info className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-blue-500" />
                    <span className="text-left">Cancellation Notice: If your plans have changed, you may cancel your pending application at any time using the &quot;Cancel&quot; action next to the booking preview.</span>
                </div>
            )}

            {displayedBookings.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No {activeTab === 'active' ? 'Active' : 'Past'} Bookings Found</h3>
                    <p className="text-slate-500 mb-6">You have not submitted any accommodation requests yet.</p>
                    <Link to="/book" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                        <PlusCircle className="w-5 h-5" />
                        Create New Booking
                    </Link>
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
                                        <p className="font-mono text-xs text-slate-500">{b.booking_id.split('-')[0]}</p>
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
                                    <td className="p-4 text-sm font-medium text-slate-800">{b.rooms_required}</td>
                                    <td className="p-4">
                                        <StatusBadge status={b.booking_state} />
                                        {extensionAwaitingApproval(b) && (
                                            <p className="text-xs text-violet-700 mt-1.5 font-bold bg-violet-50 px-2 py-1 rounded inline-block border border-violet-100">
                                                Stay extension until {new Date(b.pending_extension_datetime).toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})} awaiting approval
                                            </p>
                                        )}
                                        {b.booking_state === 'PENDING_APPROVER' && b.assigned_approver_name && (
                                            <div className="mt-1.5 inline-block text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1.5 rounded-xl shadow-sm leading-tight">
                                                Pending With: <br />
                                                <span className="font-extrabold text-amber-900">{b.assigned_approver_name}</span>
                                            </div>
                                        )}
                                        {b.booking_state === 'PENDING_ADMIN' && (
                                            <div className="mt-1.5 inline-block text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1.5 rounded-xl shadow-sm leading-tight">
                                                Pending With: <br />
                                                <span className="font-extrabold text-purple-900">Guest House Admin</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setPreviewId(b.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm">
                                            <Eye className="w-4 h-4 mr-1.5" /> Preview
                                        </button>
                                    {['PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED'].includes(b.booking_state) && !(b.checked_in_at && b.pending_extension_datetime) && (
                                        <button 
                                            onClick={() => { if(window.confirm('Are you sure you want to cancel this application?')) cancelMutation.mutate(b.booking_id); }}
                                            disabled={cancelMutation.isPending}
                                            className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors shadow-sm ml-2">
                                            <Trash2 className="w-4 h-4 mr-1.5" /> Cancel
                                        </button>
                                    )}
                                    {b.booking_state === 'CHECKED_IN' && (
                                        <button
                                            type="button"
                                            onClick={() => { setExtendModalId(b.booking_id); setExtendDatetime(new Date(b.departure_datetime).toISOString().slice(0, 16)); }}
                                            className="inline-flex items-center px-3 py-1.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-lg hover:bg-teal-100 border border-teal-200 transition-colors shadow-sm ml-2"
                                        >
                                            <CalendarClock className="w-4 h-4 mr-1.5" /> Extend stay
                                        </button>
                                    )}
                                    {(b.booking_state.endsWith('REJECTED') || b.booking_state === 'CANCELLED') && (
                                        <button 
                                            onClick={() => handleReapply(b.booking_id)}
                                            className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors shadow-sm ml-2">
                                            <RefreshCw className="w-4 h-4 mr-1.5" /> Edit & Re-apply
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

            {extendModalId && extendTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="extend-stay-title">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fade-in">
                        <h3 id="extend-stay-title" className="text-lg font-extrabold text-slate-800 tracking-tight mb-1">Extend stay</h3>
                        <p className="text-sm text-slate-500 font-medium mb-4">
                            Booking <span className="font-mono text-xs">{extendTarget.booking_id.split('-')[0]}</span> — add nights after the current scheduled departure. This will be sent for the same approver and admin review as a new application.
                            <br/><br/>Current Departure: <strong className="text-slate-800">{new Date(extendTarget.departure_datetime).toLocaleString()}</strong>
                        </p>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Exact Departure Date & Time</label>
                        <input
                            type="datetime-local"
                            value={extendDatetime}
                            min={new Date(extendTarget.departure_datetime).toISOString().slice(0, 16)}
                            onChange={(e) => setExtendDatetime(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => { setExtendModalId(null); setExtendDatetime(''); }}
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
        </div>
    );
}
