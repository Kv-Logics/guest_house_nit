import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { LayoutDashboard, FileText, PlusCircle, Eye, Trash2, Info, RefreshCw, AlertTriangle, CalendarClock } from 'lucide-react';
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
        booking.pending_extension_days != null &&
        booking.pending_extension_days > 0 &&
        ['PENDING_APPROVER', 'PENDING_ADMIN'].includes(booking.booking_state)
    );
}

export default function ApplicantDashboard() {
    const [previewId, setPreviewId] = useState(null);
    const [extendModalId, setExtendModalId] = useState(null);
    const [extendDays, setExtendDays] = useState('1');
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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
        mutationFn: ({ id, additional_days }) => bookingService.requestStayExtension(id, additional_days),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
            setExtendModalId(null);
            setExtendDays('1');
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

            const formattedData = {
                ...b,
                category_id: String(b.category_id),
                guests: formattedGuests,
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
    const hasDepartureOverdue = bookings.some((b) => stayDepartureAlert(b) === 'overdue');
    const hasDepartureWarning = bookings.some((b) => stayDepartureAlert(b) === 'warning');
    const extendTarget = extendModalId ? bookings.find((b) => b.booking_id === extendModalId) : null;

    const submitExtend = () => {
        const n = parseInt(extendDays, 10);
        if (!Number.isFinite(n) || n < 1 || n > 60) {
            alert('Please enter a whole number of days between 1 and 60.');
            return;
        }
        extendMutation.mutate({ id: extendModalId, additional_days: n });
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

            {bookings.length > 0 && hasDepartureOverdue && (
                <div className="bg-rose-50 p-4 rounded-xl text-sm font-semibold text-rose-900 leading-relaxed border border-rose-200 flex items-start mb-6 shadow-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-3 mt-0.5 text-rose-600" />
                    <span className="text-left">
                        Scheduled departure time has passed for at least one checked-in stay. Request a stay extension if guests need to remain longer; approvals follow the same route as a new booking.
                    </span>
                </div>
            )}
            {bookings.length > 0 && !hasDepartureOverdue && hasDepartureWarning && (
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

            {bookings.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Bookings Found</h3>
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
                                <th className="p-4 font-bold">Arrival</th>
                                <th className="p-4 font-bold">Departure</th>
                                <th className="p-4 font-bold">Rooms</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {bookings.map(b => (
                                <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-mono text-xs text-slate-500">{b.booking_id.split('-')[0]}</p>
                                        {b.version > 1 && (
                                            <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">v{b.version} Re-applied</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{new Date(b.arrival_datetime).toLocaleDateString()}</td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{new Date(b.departure_datetime).toLocaleDateString()}</td>
                                    <td className="p-4 text-sm font-medium text-slate-800">{b.rooms_required}</td>
                                    <td className="p-4">
                                        <StatusBadge status={b.booking_state} />
                                        {extensionAwaitingApproval(b) && (
                                            <p className="text-xs text-violet-700 mt-1.5 font-bold bg-violet-50 px-2 py-1 rounded inline-block border border-violet-100">
                                                Stay extension (+{b.pending_extension_days} day{b.pending_extension_days > 1 ? 's' : ''}) awaiting approval
                                            </p>
                                        )}
                                        {b.booking_state.startsWith('PENDING_') && b.assigned_approver_name && (
                                            <p className="text-xs text-slate-500 mt-1.5 font-medium bg-slate-100 px-2 py-1 rounded inline-block">Pending With: <br/><span className="text-slate-700 font-bold">{b.assigned_approver_name}</span></p>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setPreviewId(b.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm">
                                            <Eye className="w-4 h-4 mr-1.5" /> Preview
                                        </button>
                                    {['PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED'].includes(b.booking_state) && !(b.checked_in_at && b.pending_extension_days) && (
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
                                            onClick={() => { setExtendModalId(b.booking_id); setExtendDays('1'); }}
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
                        </p>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional nights</label>
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={extendDays}
                            onChange={(e) => setExtendDays(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => { setExtendModalId(null); setExtendDays('1'); }}
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
