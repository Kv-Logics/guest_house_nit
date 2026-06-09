import React from 'react';
import { X, Calendar, User, Download, Building, Receipt, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getFormattedBookingId } from '../../utils/booking';

export default function CheckedOutLedgerModal({ isOpen, onClose, data, onDownloadInvoice }) {
    if (!isOpen || !data) return null;

    const { booking, guestLedger, stayLedger } = data;

    // Standard helper for date formatting
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate nights for a stay
    const calculateNights = (inDate, outDate) => {
        if (!inDate || !outDate) return 0;
        const diffTime = Math.abs(new Date(outDate) - new Date(inDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1; // Minimum 1 night if checked in
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col font-sans">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Stay & Billing Ledger</h2>
                            <p className="text-xs text-slate-300">Checked Out Details & Invoice Snapshot</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Booking metadata info cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Booking reference</span>
                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded block mt-0.5 break-all">
                                    {getFormattedBookingId(booking)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Applicant / Guest</span>
                                <span className="font-bold text-slate-700 text-sm block truncate max-w-[180px]">{booking.applicant_name}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stay Period</span>
                                <span className="text-xs font-semibold text-slate-600 block">
                                    {new Date(booking.arrival_datetime).toLocaleDateString()} - {new Date(booking.departure_datetime).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Stay Ledger (Room-wise breakdown) */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Building className="w-4 h-4 text-indigo-500" />
                            1. Room-Wise Stay Ledger (Days breakdown)
                        </h3>
                        
                        {stayLedger && stayLedger.roomDaysBreakdown && stayLedger.roomDaysBreakdown.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Room Number</th>
                                            <th className="p-3">Occupying Guests</th>
                                            <th className="p-3 text-right">Daily Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                        {stayLedger.roomDaysBreakdown.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-3 font-semibold text-slate-650">
                                                    {new Date(row.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </td>
                                                <td className="p-3 font-mono text-indigo-600 font-bold">Room {row.room_number}</td>
                                                <td className="p-3 text-slate-500 text-xs">
                                                    {row.guests && row.guests.map(g => g.guest_name).join(', ')}
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-800">
                                                    ₹{Number(row.cost).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed rounded-xl text-slate-400 bg-slate-50/30">
                                No detailed day-by-day billing breakdown available.
                            </div>
                        )}
                    </div>

                    {/* Section 2: Guest Ledger */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" />
                            2. Guest Ledger (Stay Details)
                        </h3>

                        {guestLedger && guestLedger.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="p-3">Guest Name</th>
                                            <th className="p-3">Relation</th>
                                            <th className="p-3">Allocated Room</th>
                                            <th className="p-3">Checked In</th>
                                            <th className="p-3">Checked Out</th>
                                            <th className="p-3 text-center">Nights</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                        {guestLedger.map((stay) => (
                                            <tr key={stay.stay_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-800">{stay.guest_name}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{stay.phone || stay.email || ''}</div>
                                                </td>
                                                <td className="p-3 text-slate-500 text-xs uppercase font-bold tracking-wider">{stay.relation_to_applicant}</td>
                                                <td className="p-3 font-mono font-bold text-indigo-650">Room {stay.room_number || 'Unassigned'}</td>
                                                <td className="p-3 text-xs text-slate-550">{formatDate(stay.checked_in_at)}</td>
                                                <td className="p-3 text-xs text-slate-550">{formatDate(stay.checked_out_at)}</td>
                                                <td className="p-3 text-center font-mono font-bold text-indigo-600 bg-indigo-50/20">
                                                    {calculateNights(stay.checked_in_at, stay.checked_out_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed rounded-xl text-slate-400 bg-slate-50/30">
                                No guest stays logged for this booking.
                            </div>
                        )}
                    </div>

                    {/* Section 3: Billing & Receipt Details */}
                    {stayLedger && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Receipt className="w-4 h-4 text-emerald-500" />
                                    Billing Summary
                                </h4>
                                {booking.final_bill ? (
                                    <p className="text-xs text-slate-550">
                                        Settled via <strong className="text-slate-700 capitalize">{booking.final_bill.payment_mode || 'Cash/Desk'}</strong> 
                                        {booking.final_bill.transaction_ref && <span> (Ref: <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">{booking.final_bill.transaction_ref}</code>)</span>}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-550">Final billing values calculated from stay logs.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                                <div className="p-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subtotal</span>
                                    <span className="font-mono text-sm font-bold text-slate-700">₹{Number(stayLedger.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="p-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GST (12%)</span>
                                    <span className="font-mono text-sm font-bold text-slate-700">₹{Number(stayLedger.gst).toFixed(2)}</span>
                                </div>
                                <div className="p-2 bg-indigo-50/50 rounded-lg px-3">
                                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Total Billed</span>
                                    <span className="font-mono text-base font-extrabold text-indigo-700">₹{Number(stayLedger.total).toFixed(2)}</span>
                                </div>
                                <div className="p-2 bg-emerald-50/50 rounded-lg px-3">
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block">Payment Status</span>
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5 justify-end">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {booking.payment_state === 'PAID' ? 'PAID' : 'SETTLED'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center gap-4">
                    <button 
                        onClick={() => onDownloadInvoice(booking.booking_id)}
                        className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF Invoice
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-white border border-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm shadow-sm"
                    >
                        Close Ledger
                    </button>
                </div>
            </div>
        </div>
    );
}
