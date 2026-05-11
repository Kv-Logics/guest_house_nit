import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { LayoutDashboard, FileText, PlusCircle, Eye, Trash2, Info, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function ApplicantDashboard() {
    const [previewId, setPreviewId] = useState(null);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const cancelMutation = useMutation({
        mutationFn: (id) => bookingService.cancelBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
        },
        onError: (error) => {
            alert(error.response?.data?.message || error.message || 'Failed to cancel the booking. It may have already been processed or approved.');
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
                                        {b.booking_state.startsWith('PENDING_') && b.assigned_approver_name && (
                                            <p className="text-xs text-slate-500 mt-1.5 font-medium bg-slate-100 px-2 py-1 rounded inline-block">Pending With: <br/><span className="text-slate-700 font-bold">{b.assigned_approver_name}</span></p>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setPreviewId(b.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm">
                                            <Eye className="w-4 h-4 mr-1.5" /> Preview
                                        </button>
                                    {b.booking_state.startsWith('PENDING_') && (
                                        <button 
                                            onClick={() => { if(window.confirm('Are you sure you want to cancel this application?')) cancelMutation.mutate(b.booking_id); }}
                                            disabled={cancelMutation.isPending}
                                            className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors shadow-sm ml-2">
                                            <Trash2 className="w-4 h-4 mr-1.5" /> Cancel
                                        </button>
                                    )}
                                    {b.booking_state.endsWith('REJECTED') && (
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
        </div>
    );
}