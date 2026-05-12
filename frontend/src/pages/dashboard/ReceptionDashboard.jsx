import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receptionService } from '../../services/reception.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { Key, UserCheck, Clock, Search, Eye } from 'lucide-react';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';

export default function ReceptionDashboard() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [previewId, setPreviewId] = useState(null);

    // Live clock state to keep the countdown ticking without reloading the page
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['receptionArrivals'],
        queryFn: receptionService.getTodayArrivals
    });

    const checkInMutation = useMutation({
        mutationFn: (id) => receptionService.checkIn(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receptionArrivals'] })
    });

    const checkOutMutation = useMutation({
        mutationFn: (id) => receptionService.checkOut(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receptionArrivals'] })
    });

    if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading today&apos;s arrivals...</div>;

    const arrivals = data?.data || [];
    const displayedArrivals = arrivals.filter(b => {
        const term = searchTerm.toLowerCase();
        return b.booking_id.toLowerCase().includes(term) || (b.guest_names && b.guest_names.toLowerCase().includes(term)) || (b.applicant_name && b.applicant_name.toLowerCase().includes(term));
    });

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl shadow-sm border border-teal-100">
                    <Key className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Front Desk</h2>
                    <p className="text-slate-500 font-medium">Manage approved guests, daily check-ins, and active stays</p>
                </div>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Search guests, applicants, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" />
                </div>
            </div>

            {displayedArrivals.length === 0 ? (
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
                                                onClick={() => checkInMutation.mutate(b.booking_id)} 
                                                disabled={checkInMutation.isPending}
                                                className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                                            >
                                                {checkInMutation.isPending ? 'Processing...' : 'Check In'}
                                            </button>
                                        )}
                                        {(b.booking_state === 'CHECKED_IN' || b.is_extension_pending) && (
                                            <button 
                                                onClick={() => checkOutMutation.mutate(b.booking_id)} 
                                                disabled={checkOutMutation.isPending}
                                                className="px-4 py-2 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
                                            >
                                                {checkOutMutation.isPending ? 'Processing...' : 'Check Out'}
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