import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentService } from '../../services/payment.service';
import { X, CheckCircle, XCircle, AlertTriangle, CreditCard, FileText, ExternalLink, ShieldCheck, Clock } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function AdminPaymentVerificationModal({ booking, onClose, onSuccess }) {
    const [activeForm, setActiveForm] = useState('NONE'); // 'NONE', 'REJECT', 'WARN'
    const [reason, setReason] = useState('');
    const [warningLevel, setWarningLevel] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['paymentHistory', booking.booking_id],
        queryFn: () => paymentService.getProofHistory(booking.booking_id),
        enabled: !!booking
    });

    const verifyMutation = useMutation({
        mutationFn: ({ action, reason }) => paymentService.verifyPayment(booking.booking_id, action, reason),
        onSuccess: () => onSuccess()
    });

    const warnMutation = useMutation({
        mutationFn: ({ level, message }) => paymentService.sendWarning(booking.booking_id, level, message),
        onSuccess: () => onSuccess()
    });

    const posMutation = useMutation({
        mutationFn: () => paymentService.posComplete(booking.booking_id),
        onSuccess: () => onSuccess()
    });

    const handleApprove = () => {
        if (window.confirm('Are you sure you want to officially approve this payment proof?')) {
            verifyMutation.mutate({ action: 'APPROVED' });
        }
    };

    const handlePosComplete = () => {
        if (window.confirm('Has the payment been successfully collected via POS/Cash at the Front Desk?')) {
            posMutation.mutate();
        }
    };

    const submitReject = () => {
        if (!reason.trim()) return alert('Rejection reason is required.');
        verifyMutation.mutate({ action: 'REJECTED', reason });
    };

    const submitWarn = () => {
        if (!reason.trim()) return alert('Warning message is required.');
        warnMutation.mutate({ level: warningLevel, message: reason });
    };

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const history = data?.data || { proofs: [], warnings: [] };
    const latestProof = history.proofs[0];
    const hasUnreviewedProof = latestProof && latestProof.status === 'SUBMITTED';
    const isProcessing = verifyMutation.isPending || warnMutation.isPending || posMutation.isPending;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">Admin Payment Console</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{booking.applicant_name} • {booking.category_code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Proof & Details */}
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount Due</p>
                            <p className="text-3xl font-black text-slate-800">₹{booking.total_estimated_amount || 0}</p>
                            <p className="text-sm font-bold text-slate-600 mt-2">Current Status: <span className={`px-2 py-0.5 rounded text-xs text-white ${booking.payment_state === 'PAID' ? 'bg-emerald-600' : booking.payment_state.includes('WARNING') || booking.payment_state === 'REJECTED' ? 'bg-red-600' : 'bg-amber-500'}`}>{booking.payment_state.replace(/_/g, ' ')}</span></p>
                        </div>

                        {isLoading ? <div className="py-10 text-center"><LoadingSpinner /></div> : (
                            latestProof && (
                                <div className={`p-5 rounded-2xl border shadow-sm ${hasUnreviewedProof ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center"><FileText className="w-4 h-4 mr-2" /> Latest Uploaded Proof</h4>
                                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${hasUnreviewedProof ? 'bg-amber-100 text-amber-700' : latestProof.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{latestProof.status}</span>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 font-bold mb-1">Submitted At: <span className="font-medium text-slate-700">{new Date(latestProof.created_at).toLocaleString()}</span></p>
                                        {latestProof.remarks && <p className="text-xs text-slate-500 font-bold">Remarks: <span className="font-medium text-slate-700 italic">"{latestProof.remarks}"</span></p>}
                                    </div>
                                    <a href={`${API_BASE_URL.replace('/api', '')}/${latestProof.file_path}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
                                        <ExternalLink className="w-4 h-4 mr-2" /> Open Document
                                    </a>
                                </div>
                            )
                        )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-4">
                        {booking.payment_state !== 'PAID' && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Administrative Actions</h4>
                                
                                {hasUnreviewedProof ? (
                                    <>
                                        <button onClick={handleApprove} disabled={isProcessing} className="w-full flex items-center px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 font-bold text-sm rounded-xl border border-emerald-200 transition-colors shadow-sm">
                                            <CheckCircle className="w-5 h-5 mr-3" /> Approve & Mark as Paid
                                        </button>
                                        <button onClick={() => { setActiveForm('REJECT'); setReason(''); }} disabled={isProcessing} className="w-full flex items-center px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 font-bold text-sm rounded-xl border border-red-200 transition-colors shadow-sm">
                                            <XCircle className="w-5 h-5 mr-3" /> Reject Proof (Requires Resubmission)
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handlePosComplete} disabled={isProcessing} className="w-full flex items-center px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 font-bold text-sm rounded-xl border border-indigo-200 transition-colors shadow-sm">
                                            <CreditCard className="w-5 h-5 mr-3" /> POS / Cash Received at Desk
                                        </button>
                                        <button onClick={() => { setActiveForm('WARN'); setReason(''); }} disabled={isProcessing} className="w-full flex items-center px-4 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 font-bold text-sm rounded-xl border border-amber-200 transition-colors shadow-sm">
                                            <AlertTriangle className="w-5 h-5 mr-3" /> Issue Payment Warning
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Dynamic Action Forms */}
                        {activeForm === 'REJECT' && (
                            <div className="bg-red-50 p-5 rounded-2xl border border-red-200 animate-fade-in shadow-sm">
                                <label className="block text-xs font-bold text-red-800 mb-2">Reason for Rejection *</label>
                                <textarea value={reason} onChange={e => setReason(e.target.value)} rows="3" placeholder="e.g. Blurred image, incorrect amount..." className="w-full rounded-xl border border-red-200 p-3 text-sm outline-none focus:ring-2 focus:ring-red-500 mb-3" />
                                <div className="flex gap-2">
                                    <button onClick={() => setActiveForm('NONE')} className="flex-1 py-2 bg-white text-slate-600 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={submitReject} disabled={isProcessing} className="flex-1 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors shadow-sm">{isProcessing ? 'Processing...' : 'Confirm Reject'}</button>
                                </div>
                            </div>
                        )}

                        {activeForm === 'WARN' && (
                            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 animate-fade-in shadow-sm">
                                <label className="block text-xs font-bold text-amber-900 mb-2">Warning Level</label>
                                <select value={warningLevel} onChange={e => setWarningLevel(Number(e.target.value))} className="w-full rounded-xl border border-amber-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 mb-3 bg-white">
                                    <option value={1}>1st Warning - Friendly Reminder</option>
                                    <option value={2}>2nd Warning - Urgent</option>
                                    <option value={3}>3rd Warning - Final Notice</option>
                                </select>
                                <label className="block text-xs font-bold text-amber-900 mb-2">Custom Message *</label>
                                <textarea value={reason} onChange={e => setReason(e.target.value)} rows="3" placeholder="Please settle your dues immediately..." className="w-full rounded-xl border border-amber-200 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 mb-3" />
                                <div className="flex gap-2">
                                    <button onClick={() => setActiveForm('NONE')} className="flex-1 py-2 bg-white text-slate-600 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={submitWarn} disabled={isProcessing} className="flex-1 py-2 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-colors shadow-sm">{isProcessing ? 'Processing...' : 'Send Warning'}</button>
                                </div>
                            </div>
                        )}

                        {/* Warning History Preview */}
                        {history.warnings && history.warnings.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-4">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center"><Clock className="w-4 h-4 mr-2 text-amber-500" /> Warning History</h4>
                                <div className="space-y-2">
                                    {history.warnings.map((w, idx) => (
                                        <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider bg-amber-200/50 px-2 py-0.5 rounded">Level {w.warning_level}</span>
                                                <span className="text-[10px] font-bold text-slate-500">{new Date(w.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-amber-950 font-medium italic">"{w.message}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}