import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import api from '../../services/api';
import { X, FileText, Users, Utensils, Paperclip, Loader2, RefreshCw, History } from 'lucide-react';
import StatusBadge from './StatusBadge';
import nitLogo from '../../assets/images/nitlogo.png';

export default function BookingDetailsModal({ bookingId, onClose }) {
    const [showFood, setShowFood] = useState(false); // Default to hiding food

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

    const renderTimeline = (booking) => {
        const steps = [
            { id: 1, title: 'Submitted', description: 'Application Received' },
            { id: 2, title: 'Authority', description: booking.assigned_approver_name || 'Pending Routing' },
            { id: 3, title: 'Admin', description: 'Verification & Payment' },
            { id: 4, title: 'Front Desk', description: 'Check-in & Stay' }
        ];

        let currentStep = 1;
        let isRejected = false;
        const state = booking.booking_state;

        if (state === 'PENDING_APPROVER') currentStep = 2;
        else if (state === 'APPROVER_REJECTED') { currentStep = 2; isRejected = true; }
        else if (state === 'PENDING_ADMIN') currentStep = 3;
        else if (state === 'ADMIN_REJECTED') { currentStep = 3; isRejected = true; }
        else if (['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CONFIRMED'].includes(state)) currentStep = 4;
        else if (['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(state)) currentStep = 5;
        else if (state === 'CANCELLED') { currentStep = 1; isRejected = true; }

        return (
            <div className="w-full pt-8 pb-12 px-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center justify-between w-full max-w-2xl mx-auto relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded-full z-0 transition-all duration-500" style={{ width: `${(Math.min(currentStep - 1, 3) / 3) * 100}%` }}></div>
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

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                    <div className="flex items-center gap-5">
                        <img src={nitLogo} alt="NIT Logo" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-extrabold text-slate-800">Booking Preview</h3>
                                {booking && <StatusBadge status={booking.booking_state} />}
                                {booking && booking.version > 1 && (
                                    <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm flex items-center">
                                        <RefreshCw className="w-3 h-3 mr-1.5" /> Re-applied (v{booking.version})
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-bold tracking-wider mt-0.5 uppercase">National Institute of Technology, Tiruchirappalli</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
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
                        {renderTimeline(booking)}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                            
                            {/* Application Details */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-slate-400" /> Application Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Applicant</p><p className="text-slate-800 font-semibold">{booking.applicant_name}</p><p className="text-xs text-slate-500">{booking.applicant_email}</p></div>
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Category & Visit</p><p className="text-slate-800 font-semibold">{booking.category_code || `CAT-${booking.category_id}`} - <span className="capitalize">{booking.visit_type}</span></p></div>
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Purpose</p><p className="text-slate-800 font-semibold">{booking.purpose_of_visit}</p></div>
                                    {booking.assigned_approver_name && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Routed To</p><p className="text-slate-800 font-semibold">{booking.assigned_approver_name}</p></div>}
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Duration</p><p className="text-slate-800 font-semibold">{new Date(booking.arrival_datetime).toLocaleDateString()} to {new Date(booking.departure_datetime).toLocaleDateString()}</p><p className="text-xs text-blue-600 font-bold mt-0.5">{calculateDuration(booking.arrival_datetime, booking.departure_datetime)}</p></div>
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Payment</p><p className="text-slate-800 font-semibold capitalize">{booking.payment_responsible}</p></div>
                                    {booking.project_code && <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Project Code</p><p className="text-slate-800 font-semibold">{booking.project_code}</p></div>}
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Rooms</p><p className="text-slate-800 font-semibold">{booking.rooms_required} x {booking.room_type || 'Standard Room'}</p>{booking.extra_beds > 0 && <p className="text-xs text-slate-500">+{booking.extra_beds} Extra Bed(s)</p>}</div>
                                    <div><p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Est. Amount</p><p className="text-emerald-700 font-bold">₹{booking.total_estimated_amount || booking.estimated_amount || 0}</p></div>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {booking.guests.filter(Boolean).map((guest, idx) => (
                                            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm transition-all">
                                                <p className="font-bold text-slate-800">{guest.guest_name}</p>
                                                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{guest.relation_to_applicant || 'Guest'}</p>
                                                <div className="mt-2 space-y-1 text-slate-600">
                                                    {guest.phone && <p>📞 {guest.phone}</p>}
                                                    {guest.email && <p>✉️ {guest.email}</p>}
                                                    {(guest.arrival_datetime && guest.departure_datetime) && <p className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded inline-block mt-1">📅 {new Date(guest.arrival_datetime).toLocaleDateString()} to {new Date(guest.departure_datetime).toLocaleDateString()} • {calculateDuration(guest.arrival_datetime, guest.departure_datetime)}</p>}
                                                </div>
                                                {showFood && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 animate-fade-in">
                                                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center">
                                                            <Utensils className="w-3 h-3 mr-1" /> Meal Requests
                                                        </p>
                                                        {guest.food_preferences && guest.food_preferences.filter(Boolean).length > 0 ? (
                                                            <div className="space-y-1">
                                                                {guest.food_preferences.filter(Boolean).map((meal, mIdx) => (
                                                                    <div key={mIdx} className="text-xs bg-white p-2 rounded-lg border border-slate-100 grid grid-cols-4 gap-1 text-center shadow-sm">
                                                                        <span className="font-semibold text-slate-700 text-left">{new Date(meal.meal_date || meal.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
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
                                ) : <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No guests listed.</p>}
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
                                        {historyRes.data.map((log, idx) => (
                                            <div key={idx} className="relative pl-6">
                                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.action.includes('REJECT') ? 'bg-red-500' : log.action === 'REAPPLIED' ? 'bg-amber-500' : log.action === 'SUBMITTED' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm shadow-sm transition-all hover:shadow-md">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                                                        <div>
                                                            <span className={`font-extrabold px-2 py-1 rounded text-xs uppercase tracking-wider ${log.action.includes('REJECT') ? 'bg-red-100 text-red-700' : log.action === 'REAPPLIED' ? 'bg-amber-100 text-amber-700' : log.action === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                {log.action.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="font-semibold text-slate-600 text-xs ml-0 sm:ml-3 mt-2 sm:mt-0 block sm:inline">
                                                                Action by: <span className="text-slate-800">{log.approver_name || 'System / Applicant'}</span>
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
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}