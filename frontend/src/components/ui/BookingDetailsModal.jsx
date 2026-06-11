import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { X, FileText, Users, Utensils, Paperclip, Loader2, RefreshCw, History, AlertCircle, Receipt, ShieldCheck, Download, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import nitLogo from '../../assets/images/nitlogo.png';
import GSTInvoiceModal from '../../pages/booking/GSTInvoiceModal';
import { QRCodeCanvas } from 'qrcode.react';
import { getFormattedBookingId } from '../../utils/booking';
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
    if (act === 'ROOM_ALLOCATED') {
        return {
            dot: 'bg-indigo-500',
            badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            cardBorder: 'border-indigo-200 bg-indigo-50/10'
        };
    }
    if (act === 'ROOM_TRANSFER') {
        return {
            dot: 'bg-sky-500',
            badge: 'bg-sky-50 text-sky-700 border-sky-100',
            cardBorder: 'border-sky-200 bg-sky-50/10'
        };
    }
    if (act === 'STAY_EXTENDED' || act === 'EXTENSION_REQUESTED') {
        return {
            dot: 'bg-violet-500',
            badge: 'bg-violet-50 text-violet-700 border-violet-100',
            cardBorder: 'border-violet-200 bg-violet-50/10'
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

export default function BookingDetailsModal({ bookingId, onClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showFood, setShowFood] = useState(false); // Default to hiding food
    const [showInvoice, setShowInvoice] = useState(false);
    const qrRef = useRef(null);

    const isAuthorityOrAdmin = user && ['hod', 'dean', 'registrar', 'director', 'super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff'].includes(user.role);

    const { data, isLoading } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: () => bookingService.getBookingById(bookingId),
        enabled: !!bookingId
    });

    const { data: historyRes } = useQuery({
        queryKey: ['bookingHistory', bookingId],
        queryFn: async () => {
            const res = await api.get(`/bookings/${bookingId}/history`);
            return res; // api.js already unwraps response.data
        },
        enabled: !!bookingId
    });

    const canViewOverrides = user && ['gh_coordinator', 'reception_staff', 'super_admin', 'guest_house_admin'].includes(user.role);

    const { data: overridesRes } = useQuery({
        queryKey: ['bookingOverrides', bookingId],
        queryFn: async () => {
            const res = await api.get(`/reception/bookings/${bookingId}/override-logs`);
            return res;
        },
        enabled: !!bookingId && !!canViewOverrides
    });

    if (!bookingId) return null;

    const booking = data?.data;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const calculateDuration = (start, end) => {
        if (!start || !end) return '';
        const diffMs = new Date(end) - new Date(start);
        if (diffMs <= 0) return 'Invalid Duration';
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (diffDays > 0 && diffHours > 0) return `${diffDays} Days ${diffHours} Hours`;
        if (diffDays > 0) return `${diffDays} Days`;
        if (diffHours > 0) return `${diffHours} Hours`;
        return '< 1 Hour';
    };

    const downloadQRCode = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current.querySelector('canvas');
        if (!canvas) return;
        
        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const downloadLink = document.createElement('action');
        downloadLink.href = pngUrl;
        downloadLink.download = `GH-Pass-${bookingId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const getApproverDesignation = (booking) => {
        if (!booking || !booking.assigned_approver_id) return 'Pending Routing';
        const role = booking.assigned_approver_role ? String(booking.assigned_approver_role).toUpperCase() : '';
        const dept = booking.assigned_approver_department ? booking.assigned_approver_department : '';
        if (!role) return 'Authority';
        if (role === 'DIRECTOR') return 'Director';
        if (role === 'REGISTRAR') return 'Registrar';
        if (dept) return `${role} (${dept})`;
        return role;
    };

    const renderTimeline = (booking) => {
        const isSuiteRoom = booking.room_type === 'Suite Room' || booking.room_type === 'Mini Suite Room' || booking.booking_state === 'PENDING_DIRECTOR' || booking.booking_state === 'DIRECTOR_REJECTED';
        const isApplicant = !user || !['hod', 'dean', 'registrar', 'director', 'super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff'].includes(user.role);

        const steps = isSuiteRoom ? (
            isApplicant ? [
                { id: 1, title: 'Submitted', description: 'Application Received' },
                { id: 2, title: 'HOD / Dean', description: 'Authority Review' },
                { id: 3, title: 'Director', description: 'Director Review' },
                { id: 4, title: 'GH Chairperson', description: 'Room & Payment' },
                { id: 5, title: 'Reception', description: 'Check-In' }
            ] : [
                { id: 1, title: 'Submitted', description: 'Application Received' },
                { id: 2, title: 'HOD / Dean', description: getApproverDesignation(booking) },
                { id: 3, title: 'Director', description: 'Director Review' },
                { id: 4, title: 'Admin', description: 'Room Allocation' },
                { id: 5, title: 'Reception', description: 'Check-In' }
            ]
        ) : (
            isApplicant ? [
                { id: 1, title: 'Submitted', description: 'Application Received' },
                { id: 2, title: 'Authority', description: 'Authority Review' },
                { id: 3, title: 'GH Chairperson', description: 'Room & Payment' },
                { id: 4, title: 'Reception', description: 'Check-In' }
            ] : [
                { id: 1, title: 'Submitted', description: 'Application Received' },
                { id: 2, title: 'Authority', description: getApproverDesignation(booking) },
                { id: 3, title: 'Admin', description: 'Room Allocation' },
                { id: 4, title: 'Reception', description: 'Check-In' }
            ]
        );

        let currentStep = 1;
        let isRejected = false;
        const state = booking.booking_state;

        if (isSuiteRoom) {
            if (state === 'PENDING_APPROVER') currentStep = 2;
            else if (state === 'APPROVER_REJECTED') { currentStep = 2; isRejected = true; }
            else if (state === 'PENDING_DIRECTOR') currentStep = 3;
            else if (state === 'DIRECTOR_REJECTED') { currentStep = 3; isRejected = true; }
            else if (state === 'PENDING_ADMIN') currentStep = 4;
            else if (state === 'ADMIN_REJECTED') { currentStep = 4; isRejected = true; }
            else if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CONFIRMED'].includes(state)) currentStep = 5;
            else if (['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(state)) currentStep = 6;
            else if (state === 'CANCELLED') { currentStep = 1; isRejected = true; }
        } else {
            if (state === 'PENDING_APPROVER') currentStep = 2;
            else if (state === 'APPROVER_REJECTED') { currentStep = 2; isRejected = true; }
            else if (state === 'PENDING_ADMIN') currentStep = 3;
            else if (state === 'ADMIN_REJECTED') { currentStep = 3; isRejected = true; }
            else if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CONFIRMED'].includes(state)) currentStep = 4;
            else if (['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(state)) currentStep = 5;
            else if (state === 'CANCELLED') { currentStep = 1; isRejected = true; }
        }

        const totalSteps = steps.length;

        return (
            <div className="w-full pt-8 pb-12 px-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center justify-between w-full max-w-2xl mx-auto relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.min(currentStep - 1, totalSteps - 1) / (totalSteps - 1)) * 100}%` }}></div>
                    {steps.map((step) => {
                        const isComplete = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const isError = isCurrent && isRejected;
                        let bgColor = 'bg-slate-200'; let textColor = 'text-slate-400'; let borderColor = 'border-white';
                        if (isComplete) { bgColor = 'bg-blue-500'; textColor = 'text-blue-700'; }
                        else if (isCurrent) { bgColor = isError ? 'bg-red-500' : 'bg-amber-400'; textColor = isError ? 'text-red-600' : 'text-amber-600'; borderColor = isError ? 'border-red-100' : 'border-amber-100'; }
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center text-white font-extrabold text-xs transition-colors shadow-sm ${bgColor} ${isCurrent ? borderColor + ' ring-4 ring-white' : 'border-white'}`}>
                                    {isComplete ? '✓' : (isError ? '✕' : step.id)}
                                </div>
                                <div className="absolute top-10 text-center w-28 -ml-10">
                                    <p className={`text-xs font-bold ${isCurrent || isComplete ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                                    <p className={`text-[10px] font-semibold mt-0.5 leading-tight ${isCurrent || isComplete ? textColor : 'text-slate-400'}`}>{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderExtensionTimeline = (booking) => {
        const hasExtensionRequests = booking.stay_extension_requests && booking.stay_extension_requests.length > 0;
        if (!booking.pending_extension_datetime && !hasExtensionRequests) return null;

        const requestDate = hasExtensionRequests ? booking.stay_extension_requests[0].created_at : booking.pending_extension_datetime;

        const steps = [
            { id: 1, title: 'Requested', description: requestDate ? new Date(requestDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Extension Requested' },
            { id: 2, title: 'Authority', description: getApproverDesignation(booking) },
            { id: 3, title: 'Admin', description: 'Verification & Payment' },
            { id: 4, title: 'Applied', description: 'Dates Updated' }
        ];

        let currentStep = 2; // Default: waiting at Authority (Step 2)
        
        if (hasExtensionRequests) {
            const allApproved = booking.stay_extension_requests.every(e => e.status === 'APPROVED');
            const anyRejected = booking.stay_extension_requests.some(e => e.status === 'REJECTED');
            const isAtAdmin = booking.stay_extension_requests.some(e => e.status === 'PENDING_ADMIN');
            
            if (allApproved && booking.stay_extension_requests.every(e => e.is_allocated)) {
                currentStep = 5; // Fully done and allocated
            } else if (allApproved) {
                currentStep = 4; // Dates updated, waiting for reception allocation
            } else if (isAtAdmin) {
                currentStep = 3; // Authority approved or self-approved
            } else if (anyRejected) {
                currentStep = 2; // Rejected at authority or admin
            }
        }

        return (
            <div className="w-full pt-6 pb-10 px-6 border-b border-slate-100 bg-violet-50/50">
                <div className="text-center mb-8">
                    <span className="text-xs font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-full border border-violet-200 uppercase tracking-wider shadow-sm">Stay Extension Status</span>
                </div>
                <div className="flex items-center justify-between w-full max-w-2xl mx-auto relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-violet-200/60 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-violet-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.min(currentStep - 1, 3) / 3) * 100}%` }}></div>
                    {steps.map((step) => {
                        const isComplete = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        let bgColor = 'bg-violet-200'; let textColor = 'text-violet-400'; let borderColor = 'border-violet-50';
                        if (isComplete) { bgColor = 'bg-violet-500'; textColor = 'text-violet-700'; }
                        else if (isCurrent) { bgColor = 'bg-amber-400'; textColor = 'text-amber-600'; borderColor = 'border-amber-100'; }
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center text-white font-extrabold text-xs transition-colors shadow-sm ${bgColor} ${isCurrent ? borderColor + ' ring-4 ring-violet-50' : 'border-violet-50'}`}>
                                    {isComplete ? '✓' : step.id}
                                </div>
                                <div className="absolute top-10 text-center w-28 -ml-10">
                                    <p className={`text-xs font-bold ${isCurrent || isComplete ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                                    <p className={`text-[10px] font-semibold mt-0.5 leading-tight ${isCurrent || isComplete ? textColor : 'text-slate-400'}`}>{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAdminCat2Timeline = (booking) => {
        const isApplicant = !user || !['hod', 'dean', 'registrar', 'director', 'super_admin', 'guest_house_admin', 'gh_coordinator', 'reception_staff'].includes(user.role);
        const steps = isApplicant ? [
            { id: 1, title: 'Submitted', description: 'Admin Application' },
            { id: 2, title: 'Authority', description: 'Authority Review / Approved' }
        ] : [
            { id: 1, title: 'Submitted', description: 'Admin Application' },
            { id: 2, title: 'Authority', description: getApproverDesignation(booking) }
        ];

        let currentStep = 1;
        let isRejected = false;
        const state = booking.booking_state;

        if (state === 'PENDING_APPROVER') currentStep = 2;
        else if (state === 'APPROVER_REJECTED') { currentStep = 2; isRejected = true; }
        else if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(state)) currentStep = 3;
        else if (state === 'CANCELLED') { currentStep = 1; isRejected = true; }

        const totalSteps = steps.length;

        return (
            <div className="w-full pt-8 pb-12 px-6 border-b border-slate-100 bg-sky-50/80">
                <div className="text-center mb-6">
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full border border-sky-200 uppercase tracking-wider shadow-sm">Admin CAT-II Workflow</span>
                </div>
                <div className="flex items-center justify-between w-full max-w-xl mx-auto relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-sky-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.min(currentStep - 1, totalSteps - 1) / (totalSteps - 1)) * 100}%` }}></div>
                    {steps.map((step) => {
                        const isComplete = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const isError = isCurrent && isRejected;
                        let bgColor = 'bg-slate-200'; let textColor = 'text-slate-400'; let borderColor = 'border-white';
                        if (isComplete) { bgColor = 'bg-sky-500'; textColor = 'text-sky-700'; }
                        else if (isCurrent) { bgColor = isError ? 'bg-red-500' : 'bg-amber-400'; textColor = isError ? 'text-red-600' : 'text-amber-600'; borderColor = isError ? 'border-red-100' : 'border-amber-100'; }
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center text-white font-extrabold text-xs transition-colors shadow-sm ${bgColor} ${isCurrent ? borderColor + ' ring-4 ring-white' : 'border-white'}`}>
                                    {isComplete ? '✓' : (isError ? '✕' : step.id)}
                                </div>
                                <div className="absolute top-10 text-center w-28 -ml-10">
                                    <p className={`text-xs font-bold ${isCurrent || isComplete ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                                    <p className={`text-[10px] font-semibold mt-0.5 leading-tight ${isCurrent || isComplete ? textColor : 'text-slate-400'}`}>{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPaymentTimeline = (booking) => {
        if (booking.category_id === 1 || booking.payment_responsible === 'institute' || Number(booking.total_estimated_amount) === 0) return null;

        const steps = [
            { id: 1, title: 'Pending', description: 'Awaiting Payment' },
            { id: 2, title: 'Processing', description: 'Proof / POS' },
            { id: 3, title: 'Paid', description: 'Verified & Complete' }
        ];

        let currentStep = 1;
        let isRejected = false;
        let isWarning = false;
        const state = booking.payment_state;

        if (state === 'PAID') currentStep = 4;
        else if (['PAYMENT_PROOF_SUBMITTED', 'PAYMENT_PROOF_RESUBMITTED', 'UNDER_REVIEW'].includes(state)) currentStep = 2;
        else if (state === 'REJECTED') { currentStep = 2; isRejected = true; }
        else if (state.includes('WARNING')) { currentStep = 1; isWarning = true; }

        return (
            <div className="w-full pt-6 pb-10 px-6 border-b border-slate-100 bg-emerald-50/40">
                <div className="text-center mb-8">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider shadow-sm">Payment Workflow</span>
                </div>
                <div className="flex items-center justify-between w-full max-w-xl mx-auto relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-emerald-200/60 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-emerald-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.min(currentStep - 1, 2) / 2) * 100}%` }}></div>
                    {steps.map((step) => {
                        const isComplete = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const isError = isCurrent && isRejected;
                        const isWarn = isCurrent && isWarning;
                        let bgColor = 'bg-emerald-200'; let textColor = 'text-emerald-400'; let borderColor = 'border-emerald-50';
                        if (isComplete) { bgColor = 'bg-emerald-500'; textColor = 'text-emerald-700'; }
                        else if (isError) { bgColor = 'bg-red-500'; textColor = 'text-red-600'; borderColor = 'border-red-100'; }
                        else if (isWarn) { bgColor = 'bg-amber-500'; textColor = 'text-amber-600'; borderColor = 'border-amber-100'; }
                        else if (isCurrent) { bgColor = 'bg-blue-400'; textColor = 'text-blue-600'; borderColor = 'border-blue-100'; }
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center text-white font-extrabold text-xs transition-colors shadow-sm ${bgColor} ${isCurrent || isComplete ? borderColor + ' ring-4 ring-emerald-50' : 'border-emerald-50'}`}>
                                    {isComplete ? '✓' : (isError ? '✕' : isWarn ? '!' : step.id)}
                                </div>
                                <div className="absolute top-10 text-center w-28 -ml-10">
                                    <p className={`text-xs font-bold ${isCurrent || isComplete ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                                    <p className={`text-[10px] font-semibold mt-0.5 leading-tight ${isCurrent || isComplete ? textColor : 'text-slate-400'}`}>{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const isAdminApplicant = ['super_admin', 'guest_house_admin'].includes(booking?.applicant_role);
    const isAdminCat2 = isAdminApplicant && String(booking?.category_id) === '2';
    const overrideLogs = overridesRes?.data || [];

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-end z-50 animate-fade-in p-0 overflow-hidden">
            <div className="bg-white h-full w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-slide-in-right">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-5">
                        <img src={nitLogo} alt="NIT Logo" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-extrabold text-slate-800">Booking Preview</h3>
                                {booking && booking.booking_state === 'PENDING_APPROVER' ? (
                                    <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm">
                                        Pending With: {isAuthorityOrAdmin && booking.assigned_approver_name ? booking.assigned_approver_name : 'Approving Authority'}
                                    </span>
                                ) : booking && booking.booking_state === 'PENDING_ADMIN' ? (
                                    <span className="bg-purple-100 text-purple-800 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-purple-200 shadow-sm">
                                        Pending With: {isAuthorityOrAdmin ? 'Guest House Admin' : 'GH Chairperson'}
                                    </span>
                                ) : (
                                    booking && <StatusBadge status={booking.booking_state} />
                                )}
                                {booking && booking.version > 1 && (
                                    <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm flex items-center">
                                        <RefreshCw className="w-3 h-3 mr-1.5" /> Re-applied (v{booking.version})
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 mt-1.5">
                                {booking && booking.payment_state && booking.category_id !== 1 && (
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm uppercase tracking-wider ${booking.payment_state === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                            booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                booking.payment_state.includes('WARNING') || booking.payment_state === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    'bg-amber-100 text-amber-800 border-amber-200'
                                        }`}>
                                        Payment: {booking.payment_state.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-bold tracking-wider mt-0.5 uppercase">National Institute of Technology, Tiruchirappalli</p>
                        </div>
                    </div>
                        <div className="flex items-center gap-2">
                        {user && (
                            (booking?.booking_type !== 'BULK_BOOKING' && booking?.user_id === user.user_id && 
                                (['PENDING_APPROVER', 'APPROVER_REJECTED', 'ADMIN_REJECTED', 'DRAFT'].includes(booking?.booking_state) || (booking?.booking_state === 'PENDING_ADMIN' && String(booking?.category_id) === '3' && user?.role === 'faculty'))
                            ) ||
                            (booking?.booking_type === 'BULK_BOOKING' && ['gh_coordinator', 'reception_staff'].includes(user.role))
                        ) && (
                            <button onClick={() => { onClose(); navigate('/booking?edit=' + bookingId); }} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm mr-2">
                                <FileText className="w-4 h-4 mr-2" /> Edit Application
                            </button>
                        )}
                        {booking && booking.category_id !== 1 && (booking.payment_state === 'PAID' || booking.booking_state === 'CHECKED_OUT') && (
                            <button onClick={() => setShowInvoice(true)} className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm mr-2">
                                <Receipt className="w-4 h-4 mr-2" /> Receipt
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 text-blue-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : !booking ? (
                        <div className="text-center py-10 text-slate-500 font-bold">Booking details not found.</div>
                    ) : (
                        <>
                            {isAdminCat2 ? renderAdminCat2Timeline(booking) : renderTimeline(booking)}
                            {renderExtensionTimeline(booking)}
                            {renderPaymentTimeline(booking)}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">

                                {/* Admin Source Indicator */}
                                {isAdminApplicant && (
                                    <div className="bg-sky-50 p-4 border border-sky-200 rounded-xl mb-[-1rem] flex items-center shadow-sm">
                                        <ShieldCheck className="w-5 h-5 mr-3 text-sky-600 flex-shrink-0" />
                                        <p className="text-sm font-bold text-sky-800">
                                            This application was submitted directly by a Guest House Admin.
                                        </p>
                                    </div>
                                )}

                                {/* Stay Extension Alert Banner */}
                                {(booking.pending_extension_datetime || (booking.stay_extension_requests && booking.stay_extension_requests.some(e => e.status === 'PENDING'))) && (
                                    <div className="bg-violet-50 p-4 border border-violet-200 rounded-xl mb-2">
                                        <p className="font-bold text-violet-800 flex items-center mb-2">
                                            <AlertCircle className="w-5 h-5 mr-2" /> Stay Extension Request
                                        </p>
                                        {booking.stay_extension_requests && booking.stay_extension_requests.some(e => e.status === 'PENDING') ? (
                                            <div className="ml-7 text-sm text-violet-800">
                                                <p className="mb-2">Applicant has requested to extend stays for the following guests:</p>
                                                <div className="bg-white rounded-lg border border-violet-100 overflow-hidden text-xs">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-violet-50">
                                                            <tr>
                                                                <th className="p-2 font-bold text-violet-700">Guest Name</th>
                                                                <th className="p-2 font-bold text-violet-700">Requested Checkout</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-violet-50">
                                                            {booking.stay_extension_requests.filter(e => e.status === 'PENDING').map(ext => {
                                                                const guest = booking.guests?.find(g => g.guest_id === ext.guest_id);
                                                                return (
                                                                    <tr key={ext.extension_id}>
                                                                        <td className="p-2 font-semibold text-slate-700">{guest?.guest_name || 'Unknown Guest'}</td>
                                                                        <td className="p-2 font-bold text-violet-700">{new Date(ext.requested_departure).toLocaleString()}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-violet-700 mt-1 ml-7">
                                                Applicant is requesting an extension until <strong>{new Date(booking.pending_extension_datetime).toLocaleString()}</strong> beyond the original departure date.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Application Details */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-slate-400" /> Application Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Applicant</p>
                                            <p className="text-slate-800 font-semibold">
                                                {booking.booking_type === 'BULK_BOOKING' 
                                                    ? (booking.bulk_booking_metadata?.applicant_name || 'N/A') 
                                                    : booking.applicant_name}
                                            </p>
                                            {booking.booking_type === 'BULK_BOOKING' && 
                                             !(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                               String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP')) && (
                                                <p className="text-xs text-indigo-600 font-bold">
                                                    Roll No: {booking.bulk_booking_metadata?.applicant_roll_number || 'N/A'}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500">
                                                {booking.booking_type === 'BULK_BOOKING' 
                                                    ? (booking.bulk_booking_metadata?.applicant_email || 'N/A') 
                                                    : booking.applicant_email}
                                            </p>
                                            {booking.booking_type === 'BULK_BOOKING' && 
                                             !(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                               String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP')) && booking.bulk_booking_metadata?.applicant_phone && (
                                                <p className="text-xs text-slate-500">
                                                    Phone: {booking.bulk_booking_metadata.applicant_phone}
                                                </p>
                                            )}
                                            {booking.booking_type === 'BULK_BOOKING' && 
                                             !(booking.bulk_booking_metadata?.applicant_designation?.toLowerCase() === 'faculty' || 
                                               String(booking.bulk_booking_metadata?.applicant_roll_number || '').toUpperCase().startsWith('EMP')) && (
                                                <p className="text-xs text-slate-500">
                                                    Dept: {booking.bulk_booking_metadata?.applicant_department || booking.bulk_booking_metadata?.department || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                        <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Category & Visit</p><p className="text-slate-800 font-semibold">{booking.category_code || `CAT-${booking.category_id}`} - <span className="capitalize">{booking.visit_type}</span></p></div>
                                        <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Purpose</p><p className="text-slate-800 font-semibold">{booking.purpose_of_visit}</p></div>
                                        {booking.assigned_approver_id && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Routed To</p><p className="text-slate-800 font-semibold">{getApproverDesignation(booking)}</p></div>}
                                        <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Duration</p><p className="text-slate-800 font-semibold">{new Date(booking.arrival_datetime).toLocaleDateString()} to {new Date(booking.departure_datetime).toLocaleDateString()}</p><p className="text-xs text-blue-600 font-bold mt-0.5">{calculateDuration(booking.arrival_datetime, booking.departure_datetime)}</p></div>
                                        {booking.checked_in_at && <div><p className="text-emerald-600 font-medium mb-1 text-xs uppercase tracking-wider">Checked In At</p><p className="text-slate-800 font-semibold">{new Date(booking.checked_in_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>}
                                        {booking.checked_out_at && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Checked Out At</p><p className="text-slate-800 font-semibold">{new Date(booking.checked_out_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>}
                                        <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Payment</p><p className="text-slate-800 font-semibold capitalize">{booking.payment_responsible}</p></div>
                                        {booking.project_code && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Project Code</p><p className="text-slate-800 font-semibold">{booking.project_code}</p></div>}
                                        <div>
                                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Rooms</p>
                                            <p className="text-slate-800 font-semibold">{booking.rooms_required} x {booking.room_type || 'Standard Room'}</p>
                                            {booking.extra_beds > 0 && <p className="text-xs text-slate-500">+{booking.extra_beds} Extra Bed In Same Room </p>}
                                            {(booking.room_type === 'Suite Room' || booking.room_type === 'Mini Suite Room') && (
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-flex">
                                                    <span>⚠️ Requires Director Approval</span>
                                                </div>
                                            )}
                                        </div>
                                        {booking.allocated_room_numbers && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Allocated Room(s)</p><p className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">{booking.allocated_room_numbers}</p></div>}
                                        <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Est. Amount</p><p className="text-emerald-700 font-bold">₹{booking.total_estimated_amount || booking.estimated_amount || 0}</p></div>
                                        {booking.room_priority && (
                                            <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-2">
                                                <p className="text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wider">Room Preference Priorities</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {booking.room_priority.split('>').map((pref, pIdx) => {
                                                        const trimPref = pref.trim();
                                                        return (
                                                            <React.Fragment key={pIdx}>
                                                                {pIdx > 0 && <span className="text-slate-400 text-xs font-bold">→</span>}
                                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-sm ${pIdx === 0
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                                                    }`}>
                                                                    {pIdx + 1}. {trimPref}
                                                                </span>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>



                                {/* Guest Details */}
                                <div>
                                    <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center">
                                            <Users className="w-4 h-4 mr-2 text-slate-400" /> Guest Information
                                        </h4>
                                        <button onClick={() => setShowFood(!showFood)} className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-bold border border-orange-200 transition-colors flex items-center shadow-sm">
                                            <Utensils className="w-3 h-3 mr-1.5" /> {showFood ? 'Hide Food' : 'Show Food'}
                                        </button>
                                    </div>
                                {booking.guests && booking.guests.filter(Boolean).length > 0 ? (
                                    <div className="space-y-4">
                                        {(() => {
                                            const roomsMap = {};
                                            booking.guests.filter(Boolean).forEach((guest) => {
                                                const rIdx = guest.room_index || 0;
                                                if (!roomsMap[rIdx]) roomsMap[rIdx] = [];
                                                roomsMap[rIdx].push(guest);
                                            });

                                            return Object.entries(roomsMap).map(([rIdxStr, guestsInRoom]) => {
                                                const rIdx = parseInt(rIdxStr);
                                                const count = guestsInRoom.length;
                                                let occLabel = 'Single';
                                                if (count === 2) occLabel = 'Double';
                                                if (count >= 3) occLabel = 'Double + Extra Bed';

                                                return (
                                                    <div key={rIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                            <span className="font-black text-slate-700 text-sm">Room {rIdx + 1}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{occLabel}</span>
                                                        </div>
                                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {guestsInRoom.map((guest, idx) => (
                                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-sm transition-all hover:shadow-md ring-1 ring-slate-200/50">
                                                                    <p className="font-bold text-slate-800">{guest.guest_name}</p>
                                                                    <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{guest.relation_to_applicant || 'Guest'}</p>
                                                                    <div className="mt-2 space-y-1 text-slate-600 text-xs">
                                                                        {guest.phone && <p>📞 {guest.phone}</p>}
                                                                        {guest.email && <p>✉️ {guest.email}</p>}
                                                                        {(guest.identity_proof_type || guest.identity_proof_number) && (
                                                                            <p>🪪 {guest.identity_proof_type || 'ID Proof'}: {guest.identity_proof_number}</p>
                                                                        )}
                                                                        {(guest.arrival_datetime || guest.arrival_date) && (guest.departure_datetime || guest.departure_date) && (
                                                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                                                <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-0.5">Stay Timeline</p>
                                                                                <p className="text-[11px] text-slate-500 font-medium">
                                                                                    {new Date(guest.arrival_datetime || guest.arrival_date).toLocaleDateString()} ({guest.arrival_time || '12:00'}) to {new Date(guest.departure_datetime || guest.departure_date).toLocaleDateString()} ({guest.departure_time || '11:00'})
                                                                                </p>
                                                                                <p className="mt-1.5">
                                                                                    <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/50 uppercase tracking-wider inline-flex items-center shadow-xs">
                                                                                        ⏱️ Duration: {calculateDuration(guest.arrival_datetime || `${guest.arrival_date}T${guest.arrival_time || '12:00'}`, guest.departure_datetime || `${guest.departure_date}T${guest.departure_time || '11:00'}`)}
                                                                                    </span>
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {showFood && (
                                                                        <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
                                                                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center">
                                                                                <Utensils className="w-3 h-3 mr-1" /> Meal Requests
                                                                            </p>
                                                                            {guest.food_preferences && guest.food_preferences.filter(Boolean).length > 0 ? (
                                                                                <div className="space-y-1">
                                                                                    {guest.food_preferences.filter(Boolean).map((meal, mIdx) => (
                                                                                        <div key={mIdx} className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 grid grid-cols-4 gap-1 text-center shadow-xs">
                                                                                            <span className="font-semibold text-slate-700 text-left">{new Date(meal.meal_date || meal.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                                            <span className="text-slate-600 font-medium" title="Breakfast">B: <span className={meal.breakfast > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.breakfast > 0 ? '✓' : '—'}</span></span>
                                                                                            <span className="text-slate-600 font-medium" title="Lunch">L: <span className={meal.lunch > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.lunch > 0 ? '✓' : '—'}</span></span>
                                                                                            <span className="text-slate-600 font-medium" title="Dinner">D: <span className={meal.dinner > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.dinner > 0 ? '✓' : '—'}</span></span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : <p className="text-xs text-slate-400 italic">No food requested.</p>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-200">No guest details provided.</p>
                                    )}
                                </div>

                                {/* Documents */}
                                {booking.documents && booking.documents.filter(Boolean).length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center">
                                            <Paperclip className="w-4 h-4 mr-2 text-slate-400" /> Attached Documents
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {booking.documents.filter(Boolean).map((doc, idx) => {
                                                const fileUrl = `${API_BASE_URL.replace('/api', '')}/${doc.file_path.replace(/\\/g, '/')}`;
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                                                        <div className="flex flex-col flex-1 truncate pr-3">
                                                            <span className="text-xs font-bold text-slate-700 truncate mb-1">{doc.document_type || 'Document'}</span>
                                                            <span className="text-[10px] text-slate-500 truncate">{doc.file_name}</span>
                                                        </div>
                                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 text-blue-600 text-xs font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors whitespace-nowrap">View File</a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* History / Remarks */}
                                {historyRes?.data && historyRes.data.length > 0 && (
                                    <div className="border-t border-slate-100 pt-8 pb-4">
                                        <h4 className="text-base font-bold text-slate-800 mb-6 flex items-center">
                                            <History className="w-5 h-5 mr-2 text-indigo-500" /> Detailed Lifecycle Tracking
                                        </h4>
                                        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                                            {historyRes.data.map((log, idx) => {
                                                const style = getActionStyle(log.action);
                                                return (
                                                    <div key={idx} className="relative pl-6">
                                                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${style.dot}`}></div>
                                                        <div className={`p-4 rounded-2xl border text-sm shadow-sm transition-all hover:shadow-md ${style.cardBorder}`}>
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                                                <div>
                                                                    <span className={`font-extrabold px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider border ${style.badge}`}>
                                                                        {log.action.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-600 text-xs ml-0 sm:ml-3 mt-2 sm:mt-0 block sm:inline">
                                                                        Action by: <span className="text-slate-800">
                                                                            {isAuthorityOrAdmin
                                                                                ? (log.approver_name || 'System / Applicant')
                                                                                : (log.approver_name === booking.applicant_name
                                                                                    ? booking.applicant_name
                                                                                    : (['APPROVED', 'REJECTED', 'APPROVER_REJECTED', 'DIRECTOR_APPROVED', 'DIRECTOR_REJECTED'].includes(log.action) ? 'Approving Authority' : 'GH Chairperson'))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                                                                    {new Date(log.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            {log.comments && (
                                                                <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-slate-700 font-medium italic shadow-sm mt-2 relative">
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-l-xl"></div>
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

                                {/* Audit & Payment History */}
                                {(booking.final_bill || overrideLogs.length > 0) && (
                                    <div className="border-t border-slate-100 pt-8 pb-4">
                                        <h4 className="text-base font-bold text-slate-800 mb-6 flex items-center">
                                            <Receipt className="w-5 h-5 mr-2 text-emerald-500" /> Audit & Payment History
                                        </h4>
                                        <div className="space-y-6">
                                            {/* Payment Details */}
                                            {booking.final_bill && (
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                                                    <h5 className="text-sm font-bold text-emerald-800 mb-3 border-b border-emerald-200/50 pb-2">Final Payment Processed</h5>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Total Paid</p>
                                                            <p className="font-bold text-slate-800">₹{booking.final_bill.amount_received || booking.final_bill.total_amount}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Mode</p>
                                                            <p className="font-semibold text-slate-700 capitalize">{booking.final_bill.payment_mode || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Ref / UTR</p>
                                                            <p className="font-mono text-xs text-slate-700">{booking.final_bill.transaction_ref || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Processed By</p>
                                                            <p className="font-semibold text-slate-700">{booking.final_bill.received_by_name || 'System'}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {booking.final_bill.payment_comments && (
                                                        <div className="mt-4 pt-4 border-t border-emerald-200/50">
                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Comments / Remarks</p>
                                                            <p className="text-sm text-emerald-900 italic font-medium">&quot;{booking.final_bill.payment_comments}&quot;</p>
                                                        </div>
                                                    )}

                                                    {booking.final_bill.payment_proof_path && (
                                                        <div className="mt-4 pt-4 border-t border-emerald-200/50">
                                                            <a 
                                                                href={`${API_BASE_URL.replace('/api', '')}/${booking.final_bill.payment_proof_path.replace(/\\/g, '/')}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
                                                            >
                                                                <FileText className="w-4 h-4" /> View Proof of Transaction
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Override Logs */}
                                            {overrideLogs.length > 0 && (
                                                <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-5 shadow-sm">
                                                    <h5 className="text-sm font-bold text-amber-800 mb-3 border-b border-amber-200/50 pb-2">Billing Overrides (GHC)</h5>
                                                    <div className="space-y-4">
                                                        {overrideLogs.map((log, idx) => (
                                                            <div key={idx} className="bg-white rounded-lg p-3 border border-amber-100 shadow-sm text-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <span className="font-bold text-amber-900">Tariff Overridden</span>
                                                                        <div className="text-xs text-amber-700 mt-1">
                                                                            <span className="line-through opacity-70">₹{log.previous_tariff}</span>
                                                                            <ArrowRight className="w-3 h-3 inline mx-2" />
                                                                            <span className="font-bold">₹{log.new_tariff}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] font-bold text-amber-600 block">{new Date(log.created_at).toLocaleString()}</span>
                                                                        <span className="text-xs font-medium text-amber-800">By: {log.overridden_by_name}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-amber-50 rounded p-2 text-xs italic text-amber-800 border border-amber-100/50 mt-2">
                                                                    &quot;{log.override_reason}&quot;
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </>
                    )}
                </div>
            </div>
            {showInvoice && <GSTInvoiceModal bookingId={bookingId} bookingData={booking} onClose={() => setShowInvoice(false)} />}
        </div>
    );
}