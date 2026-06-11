import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Receipt, CreditCard, Clock, FileText, CheckCircle, Loader2, History } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { getFormattedBookingId } from '../../../utils/booking';
import { BULK_BOOKING_STATUS_LABELS } from '../../../utils/constants';
import api from '../../../services/api';

import BulkBookingGuestsTab from './BulkBookingGuestsTab';
import BulkBookingStayLogsTab from './BulkBookingStayLogsTab';
import BulkBookingBillingTab from './BulkBookingBillingTab';
import BulkBookingPaymentsTab from './BulkBookingPaymentsTab';

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

export default function BulkBookingDetailPanel({ bookingId, onBack }) {
    const [booking, setBooking] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await bulkBookingApi.getBulkBookingById(bookingId);
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

    useEffect(() => {
        if (bookingId) fetchBookingDetails();
    }, [bookingId]);

    const handleSubmitForApproval = async () => {
        if (!window.confirm("Submit this bulk booking for approval? It can no longer be edited.")) return;
        try {
            setLoading(true);
            await bulkBookingApi.submitBulkBooking(bookingId);
            await fetchBookingDetails();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Submit failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !booking) {
        return (
            <div className="flex justify-center items-center h-[600px] bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error && !booking) {
        return (
            <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 min-h-[600px]">
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-red-600 font-bold">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {error}
            </div>
        );
    }

    const isDraft = booking.booking_state === 'DRAFT';
    const isApproved = booking.booking_state === 'ADMIN_APPROVED' || booking.booking_state === 'READY_FOR_CHECKIN' || booking.booking_state === 'CHECKED_IN' || booking.booking_state === 'CHECKED_OUT' || booking.booking_state === 'COMPLETED';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
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
                            {booking.bulk_booking_metadata?.event_name} • Ref: {booking.bulk_booking_reference}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {['DRAFT', 'PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED'].includes(booking.booking_state) && (
                        <button
                            onClick={async () => {
                                if (window.confirm("Are you sure you want to delete this bulk booking? This action cannot be undone.")) {
                                    try {
                                        setLoading(true);
                                        const res = await bulkBookingApi.deleteBulkBooking(bookingId);
                                        if (res.success) {
                                            onBack();
                                        }
                                    } catch (err) {
                                        alert(err.response?.data?.message || err.message || 'Delete failed');
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="px-5 py-2.5 bg-red-50 text-red-650 font-bold rounded-xl shadow-sm hover:bg-red-100 transition-colors"
                        >
                            Delete Booking
                        </button>
                    )}
                    {isDraft && (
                        <button
                            onClick={handleSubmitForApproval}
                            disabled={loading}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Submit for Approval
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-6 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                        activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <FileText className="w-4 h-4" /> Details
                </button>
                <button
                    onClick={() => setActiveTab('guests')}
                    className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                        activeTab === 'guests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Users className="w-4 h-4" /> Guests & Rooms
                </button>
                {isApproved && (
                    <>
                        <button
                            onClick={() => setActiveTab('stays')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                                activeTab === 'stays' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Clock className="w-4 h-4" /> Stay Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                                activeTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Receipt className="w-4 h-4" /> Billing
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                                activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <CreditCard className="w-4 h-4" /> Payments
                        </button>
                    </>
                )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50">
                {activeTab === 'details' && (
                    <div className="p-6 max-w-[80vw] mx-auto space-y-6">
                        {/* Status Stepper */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-5">Booking Lifecycle</h3>
                            <div className="flex items-center w-full">
                                {[
                                    { title: 'Draft', desc: 'Booking draft created' },
                                    { title: 'Approving Authority', desc: 'Pending authority review' },
                                    { title: 'Guest House Chair', desc: 'Pending admin approval' },
                                    { title: 'Confirmed', desc: 'Rooms ready for guests' }
                                ].map((step, idx) => {
                                    const state = booking.booking_state;
                                    let currentStepIdx = 0;
                                    if (state === 'DRAFT') {
                                        currentStepIdx = 0;
                                    } else if (state === 'PENDING_APPROVER' || state === 'APPROVER_REJECTED') {
                                        currentStepIdx = 1;
                                    } else if (state === 'PENDING_ADMIN' || state === 'ADMIN_REJECTED' || state === 'APPROVER_APPROVED') {
                                        currentStepIdx = 2;
                                    } else if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(state)) {
                                        currentStepIdx = 3;
                                    }

                                    const isCompleted = idx < currentStepIdx;
                                    const isActive = idx === currentStepIdx;
                                    const isRejected = state.includes('REJECTED');

                                    return (
                                        <React.Fragment key={step.title}>
                                            <div className="flex flex-col items-center flex-1 relative">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-200 z-10
                                                    ${isCompleted ? 'bg-emerald-500 text-white' : 
                                                      isActive ? (isRejected ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white') : 
                                                      'bg-slate-100 text-slate-400 border border-slate-200'}
                                                `}>
                                                    {isCompleted ? '✓' : idx + 1}
                                                </div>
                                                <div className="mt-2 text-center">
                                                    <div className={`text-[11px] font-bold ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                        {step.title}
                                                    </div>
                                                    <div className="text-[9px] text-slate-450 mt-0.5">{step.desc}</div>
                                                </div>
                                            </div>
                                            {idx < 3 && (
                                                <div className={`h-0.5 flex-1 -mt-7 transition-colors duration-200
                                                    ${idx < currentStepIdx ? 'bg-emerald-500' : 'bg-slate-200'}
                                                `} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Event Info</h3>
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
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Applicant Info</h3>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs font-bold text-slate-500 uppercase">Applicant</dt>
                                        <dd className="text-sm font-medium text-slate-800">{booking.bulk_booking_metadata?.applicant_name || booking.applicant_name || 'N/A'}</dd>
                                    </div>
                                    {!(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                       String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP')) && (
                                        <>
                                            <div>
                                                <dt className="text-xs font-bold text-slate-500 uppercase">Roll Number</dt>
                                                <dd className="text-sm font-medium text-slate-800">{booking.bulk_booking_metadata?.applicant_roll_number || 'N/A'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-bold text-slate-500 uppercase">Department</dt>
                                                <dd className="text-sm font-medium text-slate-800">{booking.bulk_booking_metadata?.applicant_department || booking.bulk_booking_metadata?.department || 'N/A'}</dd>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <dt className="text-xs font-bold text-slate-500 uppercase">
                                            {!(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                               String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP'))
                                                ? 'Email / Phone'
                                                : 'Email'}
                                        </dt>
                                        <dd className="text-sm font-medium text-slate-800">
                                            {booking.bulk_booking_metadata?.applicant_email}
                                            {!(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                               String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP')) && (
                                                <>
                                                    <br/>
                                                    {booking.bulk_booking_metadata?.applicant_phone}
                                                </>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Approving Authority</h3>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs font-bold text-slate-500 uppercase">Assigned Authority</dt>
                                        <dd className="text-sm font-medium text-slate-800">{booking.assigned_approver_name || 'N/A'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-bold text-slate-500 uppercase">Designation / Role</dt>
                                        <dd className="text-sm font-medium text-slate-850 font-semibold">{booking.assigned_approver_role ? booking.assigned_approver_role.toUpperCase() : 'N/A'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-bold text-slate-500 uppercase">Department</dt>
                                        <dd className="text-sm font-medium text-slate-800">{booking.assigned_approver_department || 'N/A'}</dd>
                                    </div>
                                </dl>
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
                )}

                {activeTab === 'guests' && (
                    <BulkBookingGuestsTab booking={booking} onRefresh={fetchBookingDetails} />
                )}
                {activeTab === 'stays' && isApproved && (
                    <BulkBookingStayLogsTab booking={booking} onRefresh={fetchBookingDetails} />
                )}
                {activeTab === 'billing' && isApproved && (
                    <BulkBookingBillingTab booking={booking} onRefresh={fetchBookingDetails} />
                )}
                {activeTab === 'payments' && isApproved && (
                    <BulkBookingPaymentsTab booking={booking} onRefresh={fetchBookingDetails} setActiveTab={setActiveTab} />
                )}
            </div>
        </div>
    );
}
