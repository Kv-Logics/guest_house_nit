import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, CheckCircle, CreditCard, Banknote, Search, Calendar, User, Receipt, Filter, ShieldCheck } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import { getFormattedBookingId } from '../../utils/booking';
import api from '../../services/api'; // For accessing other APIs if needed
import { useAuth } from '../../context/AuthContext';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import PaymentsTable from './PaymentsTable';
import AdminPaymentVerificationModal from '../../components/ui/AdminPaymentVerificationModal';
import BillOverrideModal from '../../components/ui/BillOverrideModal';
import { paymentService } from '../../services/payment.service';
import { ROLES } from '../../utils/constants';

const ManagePayments = () => {
    const { user } = useAuth();
    const isAdmin = [ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR].includes(user.role);
    const [subTab, setSubTab] = useState(isAdmin ? 'online_proofs' : 'pending'); // 'pending' | 'completed' | 'online_proofs'
    const [pending, setPending] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [adminBookings, setAdminBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [adminVerifyBooking, setAdminVerifyBooking] = useState(null);
    const [paymentMode, setPaymentMode] = useState('POS');
    const [transactionRef, setTransactionRef] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Search & Pagination State
    const [searchTermInput, setSearchTermInput] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [pendingOffset, setPendingOffset] = useState(0);
    const [completedOffset, setCompletedOffset] = useState(0);
    const [hasMorePending, setHasMorePending] = useState(true);
    const [hasMoreCompleted, setHasMoreCompleted] = useState(true);
    const [monthFilter, setMonthFilter] = useState('current'); // 'current' | 'archive'
    const [overrideBooking, setOverrideBooking] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    
    // UI Modals
    const [previewId, setPreviewId] = useState(null);

    const loadAdminBookings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/bookings/admin/all');
            setAdminBookings(res.data.rows || res.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load admin bookings');
        } finally {
            setLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        try {
            setAuditLogsLoading(true);
            const res = await api.get('/billing/logs');
            setAuditLogs(res.data.rows || []);
        } catch (e) {
            console.error('Error fetching audit logs', e);
        } finally {
            setAuditLogsLoading(false);
        }
    };

    const loadPendingPayments = async (offset = 0, isAppend = false) => {
        try {
            setLoading(true);
            const limit = offset === 0 ? 50 : 100;
            const res = await receptionService.getPendingPayments(limit, offset, activeSearchTerm, monthFilter);
            if (res.success) {
                const newItems = res.data.rows;
                if (isAppend) {
                    setPending(prev => [...prev, ...newItems]);
                } else {
                    setPending(newItems);
                }
                setHasMorePending(newItems.length === limit);
            }
        } catch (err) {
            setError(err.message || 'Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    const loadCompletedPayments = async (offset = 0, isAppend = false) => {
        try {
            setLoading(true);
            const limit = offset === 0 ? 50 : 100;
            const res = await receptionService.getCompletedPayments(limit, offset, activeSearchTerm, monthFilter);
            if (res.success) {
                const newItems = res.data.rows;
                if (isAppend) {
                    setCompleted(prev => [...prev, ...newItems]);
                } else {
                    setCompleted(newItems);
                }
                setHasMoreCompleted(newItems.length === limit);
            }
        } catch (err) {
            setError(err.message || 'Failed to load completed payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subTab === 'pending') {
            setPendingOffset(0);
            loadPendingPayments(0, false);
        } else if (subTab === 'completed') {
            setCompletedOffset(0);
            loadCompletedPayments(0, false);
        } else if (subTab === 'online_proofs' && isAdmin) {
            loadAdminBookings();
        } else if (subTab === 'audit_logs' && isAdmin) {
            loadAuditLogs();
        }
    }, [subTab, activeSearchTerm, monthFilter, isAdmin]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setActiveSearchTerm(searchTermInput);
    };

    const handleLoadMore = () => {
        if (subTab === 'pending') {
            const nextOffset = pendingOffset + (pendingOffset === 0 ? 50 : 100);
            setPendingOffset(nextOffset);
            loadPendingPayments(nextOffset, true);
        } else {
            const nextOffset = completedOffset + (completedOffset === 0 ? 50 : 100);
            setCompletedOffset(nextOffset);
            loadCompletedPayments(nextOffset, true);
        }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        try {
            setProcessing(true);
            const payload = {
                payment_mode: paymentMode,
                amount_received: selectedBooking.total,
                transaction_ref: paymentMode === 'POS' ? transactionRef : null
            };
            const res = await receptionService.confirmPayment(selectedBooking.booking_id, payload);
            if (res.success) {
                // Refresh both tabs to reflect accurate state
                setPendingOffset(0);
                loadPendingPayments(0, false);
                setSelectedBooking(null);
                alert('Payment confirmed successfully!');
            }
        } catch (err) {
            alert('Failed to confirm payment: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    return (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manage Payments</h2>
                        <p className="text-slate-500 font-medium mt-1">Review pending settlements and completed invoices.</p>
                    </div>
                </div>
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search Booking ID, Applicant..." 
                        className="w-full sm:w-72 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors shadow-sm"
                        value={searchTermInput}
                        onChange={(e) => setSearchTermInput(e.target.value)}
                    />
                    <button type="submit" className="hidden">Search</button>
                </form>
                <button
                    type="button"
                    onClick={() => setMonthFilter(prev => prev === 'current' ? 'archive' : 'current')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                        monthFilter === 'archive' 
                            ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    {monthFilter === 'archive' ? 'Viewing Archive' : 'View Archive'}
                </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {isAdmin && (
                    <button
                        onClick={() => setSubTab('online_proofs')}
                        className={`flex items-center whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                            subTab === 'online_proofs'
                                ? 'bg-blue-100 text-blue-800 shadow-sm border border-blue-200'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4 mr-2" /> Online Payment Proofs
                    </button>
                )}
                <button
                    onClick={() => setSubTab('pending')}
                    className={`flex items-center whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                        subTab === 'pending'
                            ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    <Banknote className="w-4 h-4 mr-2" /> Pending Desk Settlements
                </button>
                <button
                    onClick={() => setSubTab('completed')}
                    className={`flex items-center whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                        subTab === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    <CheckCircle className="w-4 h-4 mr-2" /> Completed Invoices
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setSubTab('audit_logs')}
                        className={`flex items-center whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                            subTab === 'audit_logs'
                                ? 'bg-purple-100 text-purple-800 shadow-sm border border-purple-200'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4 mr-2" /> Billing Audit Logs
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold flex items-center">
                    <span className="mr-2">⚠️</span> {error}
                </div>
            )}

            {subTab === 'pending' && (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-bold">Booking ID</th>
                                <th className="p-4 font-bold">Guest / Applicant</th>
                                <th className="p-4 font-bold">Responsibility</th>
                                <th className="p-4 font-bold text-right">Amount Due</th>
                                <th className="p-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pending.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No pending payments found.</td>
                                </tr>
                            )}
                            {pending.map(p => (
                                <tr key={p.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-sm font-bold text-indigo-600">
                                        <button onClick={() => setPreviewId(p.booking_id)} className="hover:underline">
                                            {getFormattedBookingId(p)}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800">{p.applicant_name}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${
                                            p.payment_responsible === 'guest' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {p.payment_responsible?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-extrabold text-slate-800 text-lg">{formatCurrency(p.total)}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {user.role === ROLES.RECEPTIONIST && (
                                            <button
                                                onClick={() => setSelectedBooking(p)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                                            >
                                                Settle Bill
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={() => setOverrideBooking(p)}
                                                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-bold rounded-xl shadow-sm transition-colors ml-2 border border-amber-300"
                                            >
                                                Override Bill
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hasMorePending && pending.length > 0 && !loading && (
                        <div className="p-4 text-center border-t border-slate-100 bg-slate-50">
                            <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                                Load More Records
                            </button>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'completed' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                    {isAdmin && (
                        <div className="p-4 border-b border-slate-100 flex justify-end">
                            <button
                                onClick={() => {
                                    // Basic CSV Export
                                    const csvContent = "data:text/csv;charset=utf-8," 
                                        + "Booking ID,Invoice #,Applicant,Paid On,Mode,Amount\n"
                                        + completed.map(c => `${c.formatted_id},${c.invoice_number || ''},"${c.applicant_name}",${c.paid_at},${c.payment_mode},${c.total}`).join("\n");
                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute("download", "completed_invoices.csv");
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center"
                            >
                                Export to CSV
                            </button>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-bold">Booking ID</th>
                                <th className="p-4 font-bold">Invoice #</th>
                                <th className="p-4 font-bold">Applicant</th>
                                <th className="p-4 font-bold">Paid On</th>
                                <th className="p-4 font-bold">Mode / Ref</th>
                                <th className="p-4 font-bold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {completed.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No completed payments found.</td>
                                </tr>
                            )}
                            {completed.map(p => (
                                <tr key={p.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-sm font-bold text-indigo-600">
                                        <button onClick={() => setPreviewId(p.booking_id)} className="hover:underline">
                                            {getFormattedBookingId(p)}
                                        </button>
                                    </td>
                                    <td className="p-4 font-mono text-sm text-slate-600">{p.invoice_number || 'N/A'}</td>
                                    <td className="p-4 font-bold text-slate-800">{p.applicant_name}</td>
                                    <td className="p-4 text-sm text-slate-600">{new Date(p.paid_at).toLocaleString()}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 uppercase">{p.payment_mode}</span>
                                            {p.transaction_ref && <span className="text-xs text-slate-500 font-mono">{p.transaction_ref}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-extrabold text-slate-800 text-lg">
                                        {formatCurrency(p.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    {hasMoreCompleted && completed.length > 0 && !loading && (
                        <div className="p-4 text-center border-t border-slate-100 bg-slate-50">
                            <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                                Load More Records
                            </button>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'online_proofs' && isAdmin && (
                <div className="animate-fade-in">
                    <PaymentsTable bookings={adminBookings} handleManage={setAdminVerifyBooking} refresh={loadAdminBookings} />
                </div>
            )}

            {subTab === 'audit_logs' && isAdmin && (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm animate-fade-in">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-bold">Booking ID</th>
                                <th className="p-4 font-bold">Admin</th>
                                <th className="p-4 font-bold">Old Total</th>
                                <th className="p-4 font-bold">New Total</th>
                                <th className="p-4 font-bold">Reason</th>
                                <th className="p-4 font-bold">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {auditLogs.length === 0 && !auditLogsLoading && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No override logs found.</td>
                                </tr>
                            )}
                            {auditLogs.map(log => (
                                <tr key={log.log_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono text-sm font-bold text-indigo-600">{log.booking_id}</td>
                                    <td className="p-4 font-bold text-slate-800">{log.admin_name}</td>
                                    <td className="p-4 font-medium text-slate-600">{formatCurrency(log.old_value?.total || 0)}</td>
                                    <td className="p-4 font-bold text-amber-600">{formatCurrency(log.new_value?.total || 0)}</td>
                                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={log.remarks}>{log.remarks}</td>
                                    <td className="p-4 text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Settle Bill Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <Receipt className="w-5 h-5 mr-2 text-indigo-600" />
                                Record Payment
                            </h3>
                            <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500 font-medium">Booking ID</span>
                                <span className="font-mono font-bold text-slate-800">{getFormattedBookingId(selectedBooking)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500 font-medium">Guest / Applicant</span>
                                <span className="font-bold text-slate-800">{selectedBooking.applicant_name}</span>
                            </div>
                            <div className="flex justify-between text-lg mt-4 pt-4 border-t border-slate-200">
                                <span className="text-slate-700 font-bold">Total Due</span>
                                <span className="font-extrabold text-indigo-600">{formatCurrency(selectedBooking.total)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleConfirm} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMode('POS')}
                                        className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                            paymentMode === 'POS' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <CreditCard className="w-4 h-4 mr-2" /> Card (POS)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setPaymentMode('CASH'); setTransactionRef(''); }}
                                        className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                            paymentMode === 'CASH' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <Banknote className="w-4 h-4 mr-2" /> Cash
                                    </button>
                                </div>
                            </div>

                            {paymentMode === 'POS' && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Transaction Ref / UTR</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={transactionRef}
                                        onChange={(e) => setTransactionRef(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="Enter POS Receipt Number"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setSelectedBooking(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={processing} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                                    {processing ? 'Processing...' : 'Confirm Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modals */}
            <BookingDetailsModal 
                isOpen={!!previewId} 
                onClose={() => setPreviewId(null)} 
                bookingId={previewId} 
            />

            <BillOverrideModal 
                isOpen={!!overrideBooking}
                onClose={() => setOverrideBooking(null)}
                booking={overrideBooking}
                onOverrideComplete={() => {
                    setOverrideBooking(null);
                    loadPendingPayments(0, false);
                }}
            />
            
            {adminVerifyBooking && (
                <AdminPaymentVerificationModal 
                    booking={adminVerifyBooking} 
                    onClose={() => setAdminVerifyBooking(null)} 
                    onSuccess={() => { setAdminVerifyBooking(null); loadAdminBookings(); }} 
                />
            )}
        </div>
    );
};

export default ManagePayments;
