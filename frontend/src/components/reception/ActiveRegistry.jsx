import { Users, LogOut, ArrowLeftRight, Clock, Shield } from 'lucide-react';
import { getFormattedBookingId } from '../../utils/booking';

export default function ActiveRegistry({ 
    selectedRoom, 
    now, 
    userRole,
    onCheckOutStay, 
    onOpenTransfer, 
    onSendToCleaning, 
    onOpenHistory,
    onCheckInGuest 
}) {
    if (!selectedRoom) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> Active Registry Details — Room {selectedRoom.roomId}
                </h2>
                <button 
                    onClick={() => onOpenHistory(selectedRoom.roomId)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                    <Clock className="w-3.5 h-3.5" /> View Room History
                </button>
            </div>

            {selectedRoom.guests.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">No guests allocated to this room currently.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                                <th className="p-3">Booking ID</th>
                                <th className="p-3">Guest Details</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Stay Dates</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedRoom.guests.map(guest => {
                                const isOverstaying = guest.stay_status === 'CHECKED_IN' && guest.rawCheckOut && new Date(guest.rawCheckOut) < now;
                                const isExtended = guest.expected_departure != null;
                                
                                let hasConflict = false;
                                if (isExtended && guest.stay_status === 'CHECKED_IN' && selectedRoom.future_allocations) {
                                    const extendedUntil = new Date(guest.expected_departure);
                                    hasConflict = selectedRoom.future_allocations.some(fa => 
                                        new Date(fa.allocated_from) < extendedUntil && fa.booking_id !== (guest.booking_id || selectedRoom.activeBookingId)
                                    );
                                }

                                const rowBookingId = selectedRoom.active_booking 
                                    ? `${getFormattedBookingId(selectedRoom.active_booking)}:${selectedRoom.roomId}` 
                                    : (guest.booking_id ? `${getFormattedBookingId({ booking_id: guest.booking_id, booking_state: 'APPROVED' })}:${selectedRoom.roomId}` : '');
                                return (
                                <tr key={guest.guestId || guest.stay_id} className={`hover:bg-slate-50/50 ${isOverstaying ? 'bg-red-50/50' : ''}`}>
                                    <td className="p-3">
                                        <span className="font-bold font-mono text-slate-700 text-[11px]">{rowBookingId}</span>
                                    </td>
                                    <td className={`p-3 ${isOverstaying ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}>
                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                {guest.name || guest.guest_name}
                                            {isOverstaying && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Overstay</span>}
                                            {isExtended && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Extended</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                            {guest.relation || guest.relation_to_applicant || 'Guest'}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            (guest.status || guest.stay_status) === 'CHECKED_IN' 
                                                ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                                : (guest.status || guest.stay_status) === 'CHECKED_OUT' 
                                                    ? 'bg-slate-100 text-slate-600 border-slate-300' 
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {guest.status || guest.stay_status || 'Pending'}
                                        </span>
                                        {hasConflict && (
                                            <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                                <span>⚠️ Room Conflict</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 font-mono text-[10px]">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <div>
                                                <span className="text-slate-400 font-bold block mb-0.5">APPLIED</span>
                                                <div className="text-slate-600">IN: {guest.appliedCheckIn}</div>
                                                <div className="text-slate-600">OUT: {guest.appliedCheckOut}</div>
                                            </div>
                                            <div>
                                                <span className="text-indigo-400 font-bold block mb-0.5">ACTUAL</span>
                                                <div className="text-indigo-700 font-bold">IN: {guest.actualCheckInStr || '---'}</div>
                                                <div className="text-indigo-700 font-bold">OUT: {guest.actualCheckOutStr || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        {(guest.status || guest.stay_status) === 'CHECKED_IN' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                {(() => {
                                                    const booking = selectedRoom.active_booking;
                                                    const isUnpaidGuest = booking && booking.payment_responsible === 'guest' && booking.payment_state !== 'PAID';
                                                    const isAdmin = ['super_admin', 'guest_house_admin'].includes(userRole);
                                                    const otherCheckedInGuestsCount = selectedRoom.guests.filter(g => (g.status || g.stay_status) === 'CHECKED_IN' && g !== guest).length;
                                                    
                                                    if (isUnpaidGuest && otherCheckedInGuestsCount === 0) {
                                                        if (isAdmin) {
                                                            return (
                                                                <button
                                                                    onClick={() => onCheckOutStay(guest, selectedRoom.roomId, booking, true)}
                                                                    className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 flex items-center gap-1 shadow-sm uppercase tracking-wider"
                                                                    title="Force checkout (unpaid bill)"
                                                                >
                                                                    <Shield className="w-3.5 h-3.5 text-amber-600" /> Force Out
                                                                </button>
                                                            );
                                                        } else {
                                                            return (
                                                                <button
                                                                    disabled
                                                                    className="p-2 text-slate-300 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed"
                                                                    title="Settle bill first (Guest responsible)"
                                                                >
                                                                    <LogOut className="w-4 h-4" />
                                                                </button>
                                                            );
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <div className="flex gap-1">
                                                            {hasConflict && (
                                                                <button
                                                                    onClick={() => onOpenTransfer(guest, selectedRoom.roomId, false)}
                                                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border border-blue-200"
                                                                    title="Transfer Room to Resolve Conflict"
                                                                >
                                                                    <ArrowLeftRight className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => onCheckOutStay(guest, selectedRoom.roomId, booking, false)}
                                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200"
                                                                title="Check Out Guest"
                                                            >
                                                                <LogOut className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (guest.status || guest.stay_status) === 'PENDING' ? (
                                            <div className="flex items-center justify-end">
                                                {guest.rawCheckIn && new Date(guest.rawCheckIn) > now ? (
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider text-right" title={`Can check in after ${guest.checkIn}`}>
                                                        Too Early
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => onCheckInGuest(guest.guest_id || guest.guestId)}
                                                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                                                        title="Check In Guest"
                                                    >
                                                        Check-In
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase italic">
                                                {(guest.status || guest.stay_status) === 'CHECKED_OUT' ? 'Checked Out' : 'Pending'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {/* Bulk Room Operations */}
                    <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end gap-3">
                        {selectedRoom.guests.find(g => (g.status || g.stay_status) === 'CHECKED_IN') && (
                            <button 
                                onClick={() => onOpenTransfer(selectedRoom.guests.find(g => (g.status || g.stay_status) === 'CHECKED_IN'), selectedRoom.roomId, true)}
                                className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <ArrowLeftRight className="w-4 h-4" /> Transfer Room (All Guests)
                            </button>
                        )}
                        <button 
                            onClick={() => onSendToCleaning(selectedRoom.roomId)}
                            className="bg-slate-850 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> Vacate Room & Send to Cleaning
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
