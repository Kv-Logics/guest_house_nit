import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, CreditCard, Banknote, Search, Calendar, User } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const PaymentsTab = ({ onBillGenerated }) => {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [paymentMode, setPaymentMode] = useState('POS');
    const [transactionRef, setTransactionRef] = useState('');
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadPendingPayments = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getPendingPayments();
            if (res.success) setPending(res.data);
        } catch (err) {
            setError(err.message || 'Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingPayments();
    }, []);

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

    const filtered = pending.filter(p => 
        p.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.applicant_name && p.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div><p className="text-gray-500">Loading pending payments...</p></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Pending Payments</h2>
                    <p className="text-gray-500">Checked-out bookings awaiting payment settlement.</p>
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

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6">{error}</div>}

            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Booking ID</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Applicant</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Rooms</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Dates</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Total Due</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No pending payments.</td></tr>
                            ) : filtered.map(p => (
                                <tr key={p.booking_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm font-medium">{p.booking_id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-2 text-gray-400" />
                                            {p.applicant_name || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{p.rooms_required} ({p.room_type})</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(p.arrival_datetime).toLocaleDateString()} - {new Date(p.departure_datetime).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        ₹{p.total}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => { setSelectedBooking(p); setPaymentMode('POS'); setTransactionRef(''); }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                        >
                                            Settle Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settlement Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Settle Payment</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">{selectedBooking.booking_id}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {/* Ledger Preview */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 mb-3 border-b border-blue-200 pb-2">Final Ledger</h4>
                                <div className="space-y-2 text-sm text-blue-800">
                                    <div className="flex justify-between">
                                        <span>Subtotal (Taxable):</span>
                                        <span className="font-medium">₹{selectedBooking.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>CGST (6%):</span>
                                        <span className="font-medium">₹{Math.round(selectedBooking.subtotal * 0.06)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST (6%):</span>
                                        <span className="font-medium">₹{Math.round(selectedBooking.subtotal * 0.06)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-blue-900 mt-2 pt-2 border-t border-blue-200">
                                        <span>Grand Total:</span>
                                        <span>₹{selectedBooking.total}</span>
                                    </div>
                                </div>
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
