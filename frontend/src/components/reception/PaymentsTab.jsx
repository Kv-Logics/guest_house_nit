import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, CreditCard, Banknote, Search, Calendar, User, Receipt } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import { getFormattedBookingId } from '../../utils/booking';

const PaymentsTab = ({ onBillGenerated }) => {
    const [subTab, setSubTab] = useState('pending'); // 'pending' | 'completed'
    const [pending, setPending] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [paymentMode, setPaymentMode] = useState('POS');
    const [transactionRef, setTransactionRef] = useState('');
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLedger, setShowLedger] = useState(false);
    const [pageOffset, setPageOffset] = useState(0);
    const [hasMoreCompleted, setHasMoreCompleted] = useState(true);

    const loadPendingPayments = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getPendingPayments();
            if (res.success) setPending(res.data.rows || res.data);
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
            const res = await receptionService.getCompletedPayments(limit, offset);
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
            loadPendingPayments();
        } else {
            setPageOffset(0);
            loadCompletedPayments(0, false);
        }
    }, [subTab]);

    const handleLoadMoreCompleted = () => {
        const nextOffset = pageOffset + (pageOffset === 0 ? 50 : 100);
        setPageOffset(nextOffset);
        loadCompletedPayments(nextOffset, true);
    };

    // Helper: get the displayable total; falls back to total_estimated_amount when the bill is not generated yet
    const getDisplayTotal = (p) => {
        const t = parseFloat(p.total);
        if (!isNaN(t) && t > 0) return t;
        return parseFloat(p.total_estimated_amount) || 0;
    };

    const handleOpenModal = async (booking, isLedger) => {
        setSelectedBooking(booking);
        setPaymentMode('POS');
        setTransactionRef('');
        setShowLedger(isLedger);

        if (booking.bill_missing && !booking.breakdown) {
            try {
                const res = await receptionService.previewBill(booking.booking_id);
                if (res.success) {
                    setSelectedBooking(prev => {
                        if (prev?.booking_id !== booking.booking_id) return prev;
                        return {
                            ...prev,
                            subtotal: res.data.subtotal,
                            gst: res.data.gst,
                            total: res.data.total,
                            total_estimated_amount: res.data.total,
                            breakdown: res.data.breakdown
                        };
                    });
                }
            } catch (err) {
                console.error("Failed to load bill preview", err);
            }
        }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        try {
            setProcessing(true);
            const payload = {
                payment_mode: paymentMode,
                amount_received: getDisplayTotal(selectedBooking),
                transaction_ref: paymentMode === 'POS' ? transactionRef : null
            };
            const res = await receptionService.confirmPayment(selectedBooking.booking_id, payload);
            if (res.success) {
                // Remove from pending list
                setPending(prev => prev.filter(p => p.booking_id !== selectedBooking.booking_id));
                setSelectedBooking(null);
                // Call parent to maybe open the invoice modal
                if (onBillGenerated) onBillGenerated(selectedBooking.booking_id);
            }
        } catch (err) {
            alert('Failed to confirm payment: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    const filteredPending = pending.filter(p => 
        p.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.applicant_name && p.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredCompleted = completed.filter(p => 
        p.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.invoice_number && p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.applicant_name && p.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div><p className="text-gray-500">Loading pending payments...</p></div>;

    return (
        <div className="p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Payments Management</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage pending settlements and view completed invoices.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search booking or name..." 
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setSubTab('pending')}
                    className={`px-5 py-2 rounded-xl font-bold transition-all text-sm ${
                        subTab === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Pending Settlements ({pending.length})
                </button>
                <button
                    onClick={() => setSubTab('completed')}
                    className={`px-5 py-2 rounded-xl font-bold transition-all text-sm ${
                        subTab === 'completed'
                            ? 'bg-teal-100 text-teal-800 border-2 border-teal-300 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    Completed Invoices
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6 text-sm font-medium">{error}</div>}

            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {subTab === 'pending' ? (
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Booking ID</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Applicant / Guest</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Rooms</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Dates</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Total Due</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredPending.length === 0 && !loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No pending payments.</td></tr>
                            ) : filteredPending.map(p => (
                                <tr key={p.booking_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <span className="inline-block font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 break-all leading-snug">
                                            {getFormattedBookingId(p)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-2">
                                            <User className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                                            <div>
                                                <p className="text-slate-700 font-medium text-sm">{p.applicant_name || 'N/A'}</p>
                                                {p.primary_guest_name && p.primary_guest_name !== p.applicant_name && (
                                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                                        Guest: {p.primary_guest_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{p.rooms_required} ({p.room_type})</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-600 flex items-center bg-slate-100 px-2 py-1 rounded w-fit">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(p.arrival_datetime).toLocaleDateString()} - {new Date(p.departure_datetime).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-700">
                                        ₹{getDisplayTotal(p).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button 
                                            onClick={() => handleOpenModal(p, false)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-colors shadow-sm"
                                        >
                                            Settle Payment
                                        </button>
                                        <button 
                                            onClick={() => handleOpenModal(p, true)}
                                            className="px-3 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors flex items-center gap-1 shadow-sm"
                                            title="View Guest Stays Summary & Occupancy Ledger"
                                        >
                                            <Receipt className="h-4 w-4 text-slate-500" />
                                            Ledger
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Booking ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Settled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCompleted.length === 0 && !loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No completed payments.</td></tr>
                            ) : filteredCompleted.map(p => (
                                <tr key={p.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm font-bold text-slate-700">{p.invoice_number}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-medium text-slate-500">{getFormattedBookingId(p)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{p.applicant_name || 'N/A'}</td>
                                    <td className="px-6 py-4 font-bold text-teal-700">₹{parseFloat(p.total).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${p.payment_mode === 'Cash' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                            {p.payment_mode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        {new Date(p.paid_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>

            {subTab === 'completed' && !loading && hasMoreCompleted && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={handleLoadMoreCompleted}
                        className="px-6 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-sm"
                    >
                        Load More Records
                    </button>
                </div>
            )}

            {/* Settlement Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 p-0 overflow-hidden animate-fade-in">
                    <div className="bg-white h-full w-full max-w-xl rounded-l-3xl shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-slide-in-right">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Settle Payment</h3>
                                <span className="inline-block font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 break-all mt-1">
                                    {getFormattedBookingId(selectedBooking)}
                                </span>
                                <p className="text-sm font-semibold text-slate-700 mt-1">{selectedBooking.applicant_name}</p>
                                {selectedBooking.primary_guest_name && selectedBooking.primary_guest_name !== selectedBooking.applicant_name && (
                                    <p className="text-xs text-slate-500 font-medium">Guest: {selectedBooking.primary_guest_name}</p>
                                )}
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {/* Ledger Preview */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 mb-3 border-b border-blue-200 pb-2">Final Ledger</h4>
                                {selectedBooking.bill_missing && (
                                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 font-semibold">
                                        ⚠ No bill has been generated yet for this booking. The amount shown is an estimate.
                                        Clicking <strong>Confirm Payment</strong> will auto-generate the final bill.
                                    </div>
                                )}
                                
                                {selectedBooking.breakdown && (selectedBooking.breakdown.roomDaysBreakdown?.length > 0 || selectedBooking.breakdown.items?.length > 0) && (
                                    <div className="mb-4">
                                        <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Itemized Breakdown</h5>
                                        <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-2 bg-white rounded border border-blue-100 p-2">
                                            {selectedBooking.breakdown.roomDaysBreakdown ? selectedBooking.breakdown.roomDaysBreakdown.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs text-slate-700 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                                    <div>
                                                        <p className="font-semibold">{item.date} - Room {item.room_number}</p>
                                                        {item.guests.map((g, gIdx) => (
                                                            <p key={gIdx} className="text-slate-500 ml-2">↳ {g.guest_name} (₹{g.tariff})</p>
                                                        ))}
                                                    </div>
                                                    <div className="font-bold">₹{item.cost}</div>
                                                </div>
                                            )) : selectedBooking.breakdown.items?.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs text-slate-700 pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                                    <div>
                                                        <p className="font-semibold">{item.description}</p>
                                                        {item.guests && item.guests.map((g, gIdx) => (
                                                            <p key={gIdx} className="text-slate-500 ml-2">↳ {g.guest_name} (₹{g.tariff})</p>
                                                        ))}
                                                    </div>
                                                    <div className="font-bold">₹{item.amount || item.cost}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 text-sm text-blue-800">
                                    <div className="flex justify-between">
                                        <span>Subtotal (Taxable):</span>
                                        <span className="font-medium">₹{selectedBooking.subtotal ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>CGST (6%):</span>
                                        <span className="font-medium">₹{selectedBooking.subtotal ? Math.round(selectedBooking.subtotal * 0.06) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST (6%):</span>
                                        <span className="font-medium">₹{selectedBooking.subtotal ? Math.round(selectedBooking.subtotal * 0.06) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-blue-900 mt-2 pt-2 border-t border-blue-200">
                                        <span>Grand Total{selectedBooking.bill_missing ? ' (Estimated)' : ''}:</span>
                                        <span>₹{getDisplayTotal(selectedBooking).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLedger(!showLedger)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                    {showLedger ? 'Hide Stays Breakdown & Occupancy Ledger' : 'View Guest Stays Summary & Occupancy Ledger'}
                                </button>
                                
                                {showLedger && (() => {
                                    const breakdown = selectedBooking.generated_json?.roomDaysBreakdown || selectedBooking.breakdown?.roomDaysBreakdown;
                                    if (!breakdown) {
                                        return <p className="text-sm text-slate-400 italic py-4">No detailed guest stays breakdown available yet.</p>;
                                    }
                                    if (breakdown.length === 0) {
                                        return <p className="text-sm text-slate-400 italic py-4">No occupancy records found. The guest may not have checked in to a room yet.</p>;
                                    }
                                    return (
                                        <div className="mt-3 border rounded-xl overflow-hidden text-xs max-h-52 overflow-y-auto bg-slate-50 shadow-inner">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b font-bold text-slate-600">
                                                        <th className="p-2.5">Date</th>
                                                        <th className="p-2.5">Room</th>
                                                        <th className="p-2.5">Guest Stays</th>
                                                        <th className="p-2.5 text-right">Daily Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {breakdown.map((day, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-100/50">
                                                            <td className="p-2.5 font-semibold text-slate-700">
                                                                {new Date(day.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                                                            </td>
                                                            <td className="p-2.5 font-mono font-bold text-indigo-600">{day.room_number}</td>
                                                            <td className="p-2.5 text-slate-600 font-medium">
                                                                {(day.guests || []).map((g, gIdx) => (
                                                                    <div key={gIdx} className="leading-tight py-0.5">
                                                                        • {g.guest_name} 
                                                                        {g.extra_bed && (
                                                                            <span className="bg-amber-100 text-amber-800 text-[8px] px-1 rounded ml-1 font-bold">Extra Bed</span>
                                                                        )}
                                                                        <span className="text-slate-400 ml-1">(₹{g.tariff})</span>
                                                                    </div>
                                                                ))}
                                                            </td>
                                                            <td className="p-2.5 text-right font-extrabold text-slate-800">₹{day.cost}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            <form onSubmit={handleConfirm}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMode('POS')}
                                            className={`flex items-center justify-center p-3 border rounded-lg font-medium transition-colors ${paymentMode === 'POS' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <CreditCard className="h-5 w-5 mr-2" /> POS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMode('Cash')}
                                            className={`flex items-center justify-center p-3 border rounded-lg font-medium transition-colors ${paymentMode === 'Cash' ? 'border-green-500 bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <Banknote className="h-5 w-5 mr-2" /> Cash
                                        </button>
                                    </div>
                                </div>

                                {paymentMode === 'POS' && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">POS Slip Reference / UTR Number</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. TXN987654321"
                                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={transactionRef}
                                            onChange={(e) => setTransactionRef(e.target.value)}
                                        />
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="w-full flex items-center justify-center py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors"
                                >
                                    {processing ? 'Processing...' : (
                                        <>
                                            <CheckCircle className="h-5 w-5 mr-2" />
                                            Confirm Payment & Generate Invoice
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentsTab;
