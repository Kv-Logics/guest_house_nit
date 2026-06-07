import React, { useState } from 'react';
import { Clock, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { getFormattedBookingId } from '../../utils/booking';

export default function ArrivalsTab({
    receivedApplications,
    pendingArrivals,
    expandedArrivals,
    setExpandedArrivals,
    bookingData,
    now,
    onAssignRoomClick,
    onCheckInGuest
}) {
    const [sortBy, setSortBy] = useState('app_desc');

    const sortFn = (a, b) => {
        const aArr = new Date(a.rawCheckIn || 0).getTime();
        const bArr = new Date(b.rawCheckIn || 0).getTime();
        const aApp = new Date(a.created_at || a.bookingId || 0).getTime(); // Note: bookingId string fallback
        const bApp = new Date(b.created_at || b.bookingId || 0).getTime();

        switch (sortBy) {
            case 'app_desc': return aApp !== bApp ? bApp - aApp : String(b.bookingId).localeCompare(String(a.bookingId));
            case 'app_asc': return aApp !== bApp ? aApp - bApp : String(a.bookingId).localeCompare(String(b.bookingId));
            case 'arr_asc': return aArr - bArr;
            case 'arr_desc': return bArr - aArr;
            default: return bApp - aApp;
        }
    };

    const sortedReceived = [...receivedApplications].sort(sortFn);
    const sortedPending = [...pendingArrivals].sort(sortFn);

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <Filter className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sort Arrivals:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-slate-800 text-sm font-bold outline-none focus:ring-0 py-1"
                    >
                        <option value="app_desc">Application Date (Newest)</option>
                        <option value="app_asc">Application Date (Oldest)</option>
                        <option value="arr_asc">Arrival Date (Soonest)</option>
                        <option value="arr_desc">Arrival Date (Latest)</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                {/* Column 1: Received Applications (Assign Rooms) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">Received Applications</h2>
                    
                    {sortedReceived.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No applications pending room assignment.</p>
                    ) : (
                        <div className="space-y-4">
                            {sortedReceived.map(arr => (
                            <div key={arr.bookingId} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="text-xs font-mono font-bold text-slate-400 block">
                                            {getFormattedBookingId(arr)}
                                        </span>
                                        <h3 className="font-bold text-lg text-slate-800">{arr.applicant}</h3>
                                    </div>
                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Approved</span>
                                </div>
                                <div className="text-sm text-slate-600 mb-4 space-y-1 font-medium">
                                    <p>{arr.rooms.reduce((acc, r) => acc + (r.guests || []).length, 0)} Guest(s) / {arr.rooms[0].roomType}</p>
                                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-550">
                                        <Clock className="w-3.5 h-3.5" /> 
                                        Arriving: {new Date(arr.rawCheckIn).toLocaleDateString([], { dateStyle: 'medium' })}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onAssignRoomClick(arr)}
                                    className="w-full bg-slate-100 text-slate-700 font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors text-xs"
                                >
                                    Block Room
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Column 2: Pending Check-Ins (Arrivals) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">Pending Arrivals</h2>
                
                {sortedPending.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No guests pending check-in today.</p>
                ) : (
                    <div className="space-y-4">
                        {sortedPending.map(arr => {
                            const isExpanded = !!expandedArrivals[arr.bookingId];
                            return (
                            <div key={arr.bookingId} className="border border-slate-200 rounded-xl p-5 shadow-sm bg-white">
                                <div 
                                    className="flex justify-between items-start mb-3 cursor-pointer group"
                                    onClick={() => setExpandedArrivals(prev => ({ ...prev, [arr.bookingId]: !prev[arr.bookingId] }))}
                                >
                                    <div>
                                        <span className="text-xs font-mono font-bold text-slate-400 block group-hover:text-indigo-500 transition-colors">
                                            {getFormattedBookingId(arr)}
                                        </span>
                                        <h3 className="font-bold text-lg text-slate-800">{arr.applicant}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Rooms Assigned</span>
                                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="text-slate-600 font-mono font-bold">
                                        Rooms: {arr.allocatedRoomNumbers || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium text-slate-550">
                                        <Clock className="w-3.5 h-3.5" /> 
                                        Arriving: {new Date(arr.rawCheckIn).toLocaleDateString([], { dateStyle: 'medium' })}
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="space-y-2 mt-4 border-t pt-4 border-slate-100 animate-fade-in">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pending Guests</h4>
                                        {arr.rawGuests.map(guest => {
                                            const isCheckedIn = (bookingData.rooms || []).some(room => 
                                                room.guests && room.guests.some(g => g.guest_id === guest.guest_id && g.stay_status === 'CHECKED_IN')
                                            );

                                            return (
                                                <div key={guest.guest_id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    <div>
                                                        <span className="font-bold text-sm text-slate-700 block">{guest.guest_name}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                IN: {new Date(guest.arrival_datetime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                            {guest.departure_datetime && (
                                                                <>
                                                                    <span className="text-[9px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                        OUT: {new Date(guest.departure_datetime).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                                                    </span>
                                                                    <span className="text-[9px] text-indigo-650 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                                                                        {Math.max(1, Math.ceil((new Date(guest.departure_datetime) - new Date(guest.arrival_datetime)) / (1000 * 60 * 60 * 24)))} Night(s)
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {guest.arrival_datetime && new Date(guest.arrival_datetime) > now ? (
                                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider px-3 py-1.5 border border-amber-100 rounded-lg bg-amber-50" title={`Can check in after ${new Date(guest.arrival_datetime).toLocaleString()}`}>
                                                            Too Early
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => onCheckInGuest(guest.guest_id)}
                                                            disabled={isCheckedIn}
                                                            className={`px-3 py-1.5 font-bold rounded-lg transition-colors text-xs shadow-sm border ${isCheckedIn ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'}`}
                                                        >
                                                            {isCheckedIn ? 'Checked In' : 'Check-In'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}
