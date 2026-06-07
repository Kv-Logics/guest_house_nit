import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../../services/payment.service';
import { X, UploadCloud, FileText, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { getFormattedBookingId } from '../../utils/booking';

export default function PaymentProofModal({ booking, onClose }) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [uploadError, setUploadError] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['paymentHistory', booking.booking_id],
        queryFn: () => paymentService.getProofHistory(booking.booking_id),
        enabled: !!booking
    });

    const uploadMutation = useMutation({
        mutationFn: () => paymentService.uploadProof(booking.booking_id, file, remarks),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
            queryClient.invalidateQueries({ queryKey: ['paymentHistory', booking.booking_id] });
            setFile(null);
            setRemarks('');
            setUploadError('');
            onClose();
        },
        onError: (err) => {
            setUploadError(err.message || 'Failed to upload proof.');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) {
            setUploadError('Please select a file to upload.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size must be less than 5MB.');
            return;
        }
        uploadMutation.mutate();
    };

    const canUpload = ['PENDING', 'REJECTED', 'WARNING_1_SENT', 'WARNING_2_SENT', 'WARNING_3_SENT'].includes(booking.payment_state);

    const history = data?.data || { proofs: [], warnings: [] };
    const timeline = [
        ...(history.proofs || []).map(p => ({ ...p, type: 'proof' })),
        ...(history.warnings || []).map(w => ({ ...w, type: 'warning' }))
    ];
    timeline.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">Payment Verification</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Booking ID: {getFormattedBookingId(booking)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                    
                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl border mb-6 flex items-center justify-between shadow-sm ${
                        booking.payment_state === 'PAID' ? 'bg-emerald-50 border-emerald-200' :
                        booking.payment_state.includes('WARNING') ? 'bg-amber-50 border-amber-200' :
                        booking.payment_state === 'REJECTED' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                    }`}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Amount Due</p>
                            <p className={`text-2xl font-black ${booking.payment_state === 'PAID' ? 'text-emerald-700' : 'text-slate-800'}`}>
                                ₹{booking.total_estimated_amount || 0}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Current Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-extrabold ${
                                booking.payment_state === 'PAID' ? 'bg-emerald-600 text-white' :
                                booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'bg-blue-600 text-white' :
                                booking.payment_state.includes('WARNING') || booking.payment_state === 'REJECTED' ? 'bg-red-600 text-white' :
                                'bg-slate-200 text-slate-700'
                            }`}>
                                {booking.payment_state === 'PAID' && <CheckCircle className="w-4 h-4 mr-1.5" />}
                                {booking.payment_state.includes('WARNING') && <AlertTriangle className="w-4 h-4 mr-1.5" />}
                                {booking.payment_state === 'REJECTED' && <AlertCircle className="w-4 h-4 mr-1.5" />}
                                {booking.payment_state.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Upload Form */}
                    {canUpload && (
                        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                                <UploadCloud className="w-4 h-4 mr-2 text-blue-500" /> Upload Payment Proof
                            </h4>
                            
                            {uploadError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 flex items-center border border-red-100">
                                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {uploadError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2">Screenshot / PDF Document <span className="text-red-500">*</span></label>
                                    <input type="file" required accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1 bg-slate-50 cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2">Transaction ID / Remarks (Optional)</label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="2" className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Enter UTR, Transaction ID, or any comments..." />
                                </div>
                                <button type="submit" disabled={uploadMutation.isPending} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center">
                                    {uploadMutation.isPending ? <><LoadingSpinner /> Uploading...</> : 'Submit Payment Proof'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* History Timeline */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-2">
                            <Clock className="w-4 h-4 mr-2 text-indigo-500" /> Submission & Audit History
                        </h4>
                        
                        {isLoading ? (
                            <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                        ) : timeline.length === 0 ? (
                            <p className="text-sm text-slate-500 italic text-center py-4">No payment history found.</p>
                        ) : (
                            <div className="space-y-6 mt-4 ml-2 border-l-2 border-slate-100">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="relative pl-6">
                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${item.type === 'warning' ? 'bg-amber-500' : item.status === 'APPROVED' ? 'bg-emerald-500' : item.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                        {item.type === 'warning' ? (
                                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm"><div className="flex justify-between items-start mb-2"><p className="font-extrabold text-amber-800 text-sm">Warning Level {item.warning_level}</p><span className="text-[10px] font-bold text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div><p className="text-sm text-amber-900 font-medium">{item.message}</p></div>
                                        ) : (
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{item.status}</span><span className="text-xs font-bold text-slate-700">Proof Uploaded</span></div><span className="text-[10px] font-bold text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div>{item.remarks && (<p className="text-sm text-slate-600 mt-2"><strong>Remarks:</strong> {item.remarks}</p>)}{item.status === 'REJECTED' && item.rejection_reason && (<div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 font-medium"><strong>Rejection Reason:</strong> {item.rejection_reason}</div>)}<div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center"><a href={`${API_BASE_URL.replace('/api', '')}/${item.file_path}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"><FileText className="w-3 h-3 mr-1" /> View Uploaded File</a>{item.reviewed_by && (<span className="text-[10px] text-slate-400 font-medium">Reviewed by {item.reviewed_by}</span>)}</div></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}