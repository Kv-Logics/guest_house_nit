import React, { useState } from 'react';
import { Receipt, FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { bookingService } from '../../../services/booking.service';
import BillingInfoModal from './../BillingInfoModal';

export default function BulkBookingBillingTab({ booking, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [billingInfoModalOpen, setBillingInfoModalOpen] = useState(false);

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

    const handleDownloadInvoice = async () => {
        try {
            setLoading(true);
            const res = await bookingService.downloadInvoice(booking.booking_id);
            const blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${booking.booking_id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert(err.response?.data?.error || err.message || 'Failed to download invoice');
        } finally {
            setLoading(false);
        }
    };

    const finalBill = booking.final_bill;
    const hasBill = finalBill && finalBill.total !== undefined && finalBill.total !== null;

    return (
        <div className="p-6 max-w-[80vw] mx-auto space-y-6">
            {!hasBill ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Billing Not Generated</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                        Before generating the final bill, please ensure that all guests have checked out, or you are ready to bill them up to their expected departure date.
                    </p>
                    <button
                        onClick={handleGenerateBillClick}
                        disabled={loading}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        Generate Consolidated Bill
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-indigo-600" /> Bill Summary
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Generated consolidated bill for {booking.guests?.length || 0} guests</p>
                        </div>
                        <button
                            onClick={handleDownloadInvoice}
                            disabled={loading}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-indigo-600 font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download PDF Invoice
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Room Charges</p>
                                <p className="text-xl font-black text-slate-700">₹{finalBill.subtotal || 0}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-xl font-black text-slate-800">₹{finalBill.total || 0}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paid Amount</p>
                                <p className="text-xl font-black text-emerald-600">₹{finalBill.amount_received || 0}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment State</p>
                                <p className="text-lg font-black text-slate-700 uppercase">{booking.payment_state || 'PENDING'}</p>
                            </div>
                        </div>

                        {booking.payment_state !== 'PAID' && (
                            <div className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl flex gap-3 text-sm font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
                                <p>To complete payment, please go to the Payments tab and process the transaction.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
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
