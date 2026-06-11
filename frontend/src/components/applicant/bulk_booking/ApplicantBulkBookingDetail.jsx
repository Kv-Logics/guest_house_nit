import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Receipt, Loader2, FileText, History } from 'lucide-react';
import { getFormattedBookingId } from '../../../utils/booking';
import { BULK_BOOKING_STATUS_LABELS } from '../../../utils/constants';
import api from '../../../services/api';

const getActionStyle = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('REJECT') || act === 'CANCELLED') {
        return {
            dot: 'bg-rose-500',
            badge: 'bg-rose-50 text-rose-700 border-rose-100',
            cardBorder: 'border-rose-200 bg-rose-50/10'
        };
    }
    if (act.includes('APPROV') || act === 'CONFIRMED') {
        return {
            dot: 'bg-emerald-500',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            cardBorder: 'border-emerald-200 bg-emerald-50/10'
        };
    }
    if (act === 'WITHDRAW') {
        return {
            dot: 'bg-purple-500',
            badge: 'bg-purple-50 text-purple-700 border-purple-100',
            cardBorder: 'border-purple-200 bg-purple-50/10'
        };
    }
    if (act === 'REAPPLIED') {
        return {
            dot: 'bg-amber-500',
            badge: 'bg-amber-50 text-amber-700 border-amber-100',
            cardBorder: 'border-amber-200 bg-amber-50/10'
        };
    }
    if (act === 'SUBMITTED') {
        return {
            dot: 'bg-blue-500',
            badge: 'bg-blue-50 text-blue-700 border-blue-100',
            cardBorder: 'border-blue-200 bg-blue-50/10'
        };
    }
    if (act === 'CHECKED_IN') {
        return {
            dot: 'bg-cyan-500',
            badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
            cardBorder: 'border-cyan-200 bg-cyan-50/10'
        };
    }
    if (act === 'CHECKED_OUT') {
        return {
            dot: 'bg-slate-500',
            badge: 'bg-slate-50 text-slate-700 border-slate-100',
            cardBorder: 'border-slate-200 bg-slate-50/10'
        };
    }
    return {
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        cardBorder: 'border-slate-200 bg-slate-50'
    };
};

export default function ApplicantBulkBookingDetail({ bookingId, onBack }) {
    const [booking, setBooking] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/bookings/bulk/${bookingId}`);
                if (res.success) {
                    setBooking(res.data);
                }
                try {
                    const historyRes = await api.get(`/bookings/${bookingId}/history`);
                    if (historyRes.success) {
                        setHistory(historyRes.data);
                    }
                } catch (hErr) {
                    console.error("Failed to fetch bulk booking history logs", hErr);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to load details');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [bookingId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200">
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-600 font-bold hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
                {error || 'Booking not found'}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col mt-6">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-200 shadow-sm transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-800">
                                {getFormattedBookingId(booking)}
                            </h2>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-200 text-slate-700">
                                {BULK_BOOKING_STATUS_LABELS[booking.booking_state] || booking.booking_state}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            {booking.bulk_booking_metadata?.event_name}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Event Info
                        </h3>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Event Name</dt>
                                <dd className="text-sm font-medium text-slate-800">{booking.bulk_booking_metadata?.event_name || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Dates</dt>
                                <dd className="text-sm font-medium text-slate-800">
                                    {new Date(booking.arrival_datetime).toLocaleDateString()} - {new Date(booking.departure_datetime).toLocaleDateString()}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Purpose of Visit</dt>
                                <dd className="text-sm font-medium text-slate-800">{booking.purpose_of_visit}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Expected Guests</dt>
                                <dd className="text-sm font-medium text-slate-800">{booking.bulk_booking_metadata?.expected_guest_count}</dd>
                            </div>
                        </dl>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Receipt className="w-4 h-4" /> Billing Summary
                        </h3>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Total Billed</dt>
                                <dd className="text-lg font-black text-slate-800">₹{booking.final_bill_amount || 0}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Amount Paid</dt>
                                <dd className="text-lg font-black text-emerald-600">₹{booking.amount_paid || 0}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-bold text-slate-500 uppercase">Payment State</dt>
                                <dd className="text-sm font-bold text-slate-700">{booking.payment_state || 'PENDING'}</dd>
                            </div>
                        </dl>
                        <p className="text-xs text-slate-500 mt-4 italic">
                            Billing and payments for bulk bookings are typically handled directly at the reception.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4" /> Guest Roster ({booking.guests?.length || 0})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-bold">
                                    <th className="p-4 w-12">#</th>
                                    <th className="p-4">Guest Name</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Room / Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(booking.guests || []).map((guest, idx) => (
                                    <tr key={guest.guest_id || idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-slate-800">{guest.guest_name}</p>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">
                                            {guest.phone && <div>{guest.phone}</div>}
                                            {guest.email && <div>{guest.email}</div>}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            {guest.relation_to_applicant}
                                        </td>
                                        <td className="p-4">
                                            {guest.stay_status === 'CHECKED_IN' ? (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full mr-2">ACTIVE</span>
                                            ) : guest.stay_status === 'CHECKED_OUT' ? (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full mr-2">COMPLETED</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-full mr-2">PENDING</span>
                                            )}
                                            {guest.allocated_room && (
                                                <span className="text-xs font-bold text-slate-600">Room {guest.allocated_room}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!booking.guests || booking.guests.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500 text-sm font-medium">
                                            No guests have been added to this booking yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Lifecycle Tracking */}
                {history && history.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
                        <h3 className="text-sm font-black text-slate-455 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-500" /> Detailed Lifecycle Tracking
                        </h3>
                        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                            {history.map((log, idx) => {
                                const style = getActionStyle(log.action);
                                return (
                                    <div key={idx} className="relative pl-6">
                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${style.dot}`}></div>
                                        <div className={`p-4 rounded-xl border text-xs shadow-sm transition-all hover:shadow-md bg-white ${style.cardBorder}`}>
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                                <div>
                                                    <span className={`font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${style.badge}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="font-semibold text-slate-550 ml-3 text-[11px]">
                                                        Action by: <span className="text-slate-800 font-bold">{log.approver_name || 'System / Applicant'}</span>
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {log.comments && (
                                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700 italic mt-1.5 relative font-medium">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-l-lg"></div>
                                                    &quot;{log.comments}&quot;
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
