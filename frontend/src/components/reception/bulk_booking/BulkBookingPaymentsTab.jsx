import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, IndianRupee, Receipt, FileText } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import BillingInfoModal from './../BillingInfoModal';

export default function BulkBookingPaymentsTab({ booking, onRefresh, setActiveTab }) {
    const [loading, setLoading] = useState(false);
    const [billingInfoModalOpen, setBillingInfoModalOpen] = useState(false);
    
    const balanceDue = Math.max(0, (booking.final_bill_amount || 0) - (booking.amount_paid || 0));
    const [amount, setAmount] = useState(balanceDue);
    const [paymentMethod, setPaymentMethod] = useState('OFFLINE_CASH');
    const [transactionRef, setTransactionRef] = useState('');

    useEffect(() => {
        setAmount(balanceDue);
    }, [balanceDue]);

    const handleGenerateBillClick = () => {
        if (!window.confirm("Generate final bill for this bulk booking? Ensure all guests are checked out or have their departure dates set properly.")) return;
        setBillingInfoModalOpen(true);
    };

    const handleConfirmGenerateBill = async (billingData) => {
        try {
            setBillingInfoModalOpen(false);
            setLoading(true);
            await bulkBookingApi.generateBill(booking.booking_id, billingData);
            if (onRefresh) await onRefresh();
            alert("Bill generated successfully.");
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to generate bill');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        
        if (amount <= 0) {
            alert("Amount must be greater than zero.");
            return;
        }

        if (!window.confirm(`Record payment of ₹${amount} via ${paymentMethod.replace('_', ' ')}?`)) return;

        try {
            setLoading(true);
            const payload = {
                amount_paid: amount,
                payment_method: paymentMethod,
                transaction_reference: transactionRef
            };
            
            await bulkBookingApi.completePayment(booking.booking_id, payload);
            if (onRefresh) await onRefresh();
            alert("Payment recorded successfully.");
            setTransactionRef('');
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Payment recording failed');
        } finally {
            setLoading(false);
        }
    };

    const hasBill = booking.final_bill_amount !== null && booking.final_bill_amount !== undefined;
    const isPaid = booking.payment_state === 'PAID';

    if (!hasBill) {
        return (
            <div className="p-6 max-w-[80vw] mx-auto text-center space-y-4">
                <div className="bg-orange-50 text-orange-700 p-6 rounded-2xl border border-orange-200 font-medium">
                    No consolidated bill has been generated yet for this bulk booking. Please generate the final bill before recording a payment.
                </div>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleGenerateBillClick}
                        disabled={loading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Generate Consolidated Bill
                    </button>
                    {setActiveTab && (
                        <button
                            onClick={() => setActiveTab('billing')}
                            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm transition-colors"
                        >
                            Go to Billing Tab
                        </button>
                    )}
                </div>
                
                <BillingInfoModal
                    isOpen={billingInfoModalOpen}
                    onClose={() => setBillingInfoModalOpen(false)}
                    onConfirm={handleConfirmGenerateBill}
                    title="Generate Consolidated Bill"
                    confirmText="Generate Bill"
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[80vw] mx-auto space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="bg-slate-50 p-6 border-r border-slate-100 flex-1 flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Billed</p>
                    <p className="text-3xl font-black text-slate-800 flex items-center gap-1">
                        <IndianRupee className="w-6 h-6" /> {booking.final_bill_amount || 0}
                    </p>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Paid So Far</p>
                    <p className="text-3xl font-black text-emerald-600 flex items-center gap-1">
                        <IndianRupee className="w-6 h-6" /> {booking.amount_paid || 0}
                    </p>
                </div>
                <div className="bg-slate-50 p-6 border-l border-slate-100 flex-1 flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Balance Due</p>
                    <p className="text-3xl font-black text-rose-600 flex items-center gap-1">
                        <IndianRupee className="w-6 h-6" /> {Math.max(0, (booking.final_bill_amount || 0) - (booking.amount_paid || 0))}
                    </p>
                </div>
            </div>

            {/* Payment Form */}
            {isPaid ? (
                <div className="bg-emerald-50 text-emerald-700 p-8 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-black mb-2">Payment Complete</h3>
                    <p className="font-medium text-emerald-600">The total billed amount has been fully paid.</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Record New Payment
                    </h3>
                    
                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Amount to Pay (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max={(booking.final_bill_amount || 0) - (booking.amount_paid || 0)}
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Payment Method</label>
                                <select
                                    required
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="OFFLINE_CASH">Cash (Front Desk)</option>
                                    <option value="OFFLINE_CARD">Card / POS (Front Desk)</option>
                                    <option value="ONLINE_PG">Online Gateway / UPI</option>
                                    <option value="DEPARTMENT_TRANSFER">Internal Dept Transfer</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Transaction / Receipt Ref (Optional)</label>
                                <input
                                    type="text"
                                    value={transactionRef}
                                    onChange={(e) => setTransactionRef(e.target.value)}
                                    placeholder="e.g. POS Receipt #, UPI UTR..."
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                Record Payment
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
