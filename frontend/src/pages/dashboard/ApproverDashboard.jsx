import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalService } from '../../services/approval.service';
import { bookingService } from '../../services/booking.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { ClipboardCheck, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';

export default function ApproverDashboard() {
    const queryClient = useQueryClient();
    const [actionModal, setActionModal] = useState({ isOpen: false, id: null, action: null });
    const [remarks, setRemarks] = useState('');
    const [previewId, setPreviewId] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['pendingApprovals'],
        queryFn: approvalService.getPendingApprovals
    });

    const mutation = useMutation({
        mutationFn: ({ id, payload }) => approvalService.approveBooking(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
            setActionModal({ isOpen: false, id: null, action: null });
            setRemarks('');
        }
    });

    const withdrawMutation = useMutation({
        mutationFn: (id) => approvalService.approveBooking(id, { action: 'WITHDRAW', remarks: 'Approval withdrawn by Approving Authority' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
        },
        onError: (error) => {
            alert(error.response?.data?.message || error.message || 'Failed to withdraw booking.');
        }
    });

    const handleAction = () => {
        mutation.mutate({
            id: actionModal.id,
            payload: { action: actionModal.action, remarks }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading queue...</div>;

    const approvals = data?.data || [];

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Approval Queue</h2>
                        <p className="text-slate-500 font-medium">Pending requests awaiting your review</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort by:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="app_desc">Application Date (Newest)</option>
                        <option value="app_asc">Application Date (Oldest)</option>
                        <option value="arr_asc">Arrival Date (Soonest)</option>
                        <option value="arr_desc">Arrival Date (Latest)</option>
                    </select>
                </div>
            </div>

            {approvals.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">Queue Empty</h3>
                    <p className="text-slate-500">You are all caught up!</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-bold">Applicant</th>
                                <th className="p-4 font-bold">Dates</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedApprovals.map(b => (
                                <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{b.applicant_name}</p>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{b.purpose_of_visit}</p>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">
                                        {new Date(b.arrival_datetime).toLocaleDateString()} - {new Date(b.departure_datetime).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        {b.stay_extension_requests?.some(e => e.status.startsWith('PENDING_')) ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                Extension Pending
                                            </span>
                                        ) : (
                                            <StatusBadge status={b.booking_state} />
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => setPreviewId(b.booking_id)} className="inline-flex items-center px-4 py-2 bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
                                            <Eye className="w-4 h-4 mr-1.5" /> Preview
                                        </button>
                                        {(b.booking_state === 'PENDING_APPROVER' || b.booking_state === 'PENDING_DIRECTOR' || (b.stay_extension_requests && b.stay_extension_requests.some(e => e.status === 'PENDING_AUTHORITY'))) && (
                                            <>
                                                <button onClick={() => setActionModal({ isOpen: true, id: b.booking_id, action: 'APPROVED' })} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors">Approve</button>
                                                <button onClick={() => setActionModal({ isOpen: true, id: b.booking_id, action: 'REJECTED' })} className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded-xl hover:bg-red-100 transition-colors">Reject</button>
                                            </>
                                        )}
                                        {!['CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.booking_state) && b.booking_state !== 'PENDING_APPROVER' && b.booking_state !== 'PENDING_DIRECTOR' && !(b.stay_extension_requests && b.stay_extension_requests.some(e => e.status === 'PENDING_AUTHORITY')) && (
                                            <button onClick={() => {
                                                const isRej = b.booking_state.includes('REJECT');
                                                const msg = isRej 
                                                    ? 'Are you sure you want to withdraw your rejection for this booking? This will return it to your pending queue.'
                                                    : 'Are you sure you want to withdraw your approval for this booking? This will return it to your pending queue.';
                                                if (window.confirm(msg)) {
                                                    withdrawMutation.mutate(b.booking_id);
                                                }
                                            }} disabled={withdrawMutation.isPending} className="inline-flex items-center px-4 py-2 bg-slate-50 text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 transition-colors shadow-sm ml-2" title="Withdraw Decision">
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Withdraw
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {actionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200">
                        <div className="flex items-center mb-6">
                            {actionModal.action === 'APPROVED' ? <CheckCircle className="w-6 h-6 text-emerald-500 mr-2" /> : <XCircle className="w-6 h-6 text-red-500 mr-2" />}
                            <h3 className="text-xl font-extrabold text-slate-800">
                                {actionModal.action === 'APPROVED' ? 'Approve Booking' : 'Reject Booking'}
                            </h3>
                        </div>
                        <textarea 
                            value={remarks} 
                            onChange={e => setRemarks(e.target.value)} 
                            placeholder={actionModal.action === 'REJECTED' ? "Provide a reason for rejection (Required)..." : "Add any remarks (Optional)..."} 
                            className="w-full border border-slate-200 rounded-xl p-4 mb-6 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all"
                            rows="4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setActionModal({ isOpen: false, id: null, action: null })} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button 
                                onClick={handleAction} 
                                disabled={mutation.isPending || (actionModal.action === 'REJECTED' && !remarks.trim())}
                                className={`px-5 py-2.5 text-white font-bold rounded-xl transition-all shadow-sm ${actionModal.action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {mutation.isPending ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {previewId && <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />}
        </div>
    );
}