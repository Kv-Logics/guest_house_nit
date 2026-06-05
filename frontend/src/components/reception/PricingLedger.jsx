import React from 'react';
import { Receipt } from 'lucide-react';

export default function PricingLedger({ selectedRoom, timeline, totalBill }) {
    if (!selectedRoom) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-500" /> Pricing Calculation & Occupancy Ledger
                </h2>
                <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 block">Total Active Room Invoice</span>
                    <span className="text-xl font-extrabold text-indigo-600 font-mono">₹{totalBill}</span>
                </div>
            </div>

            {timeline.length === 0 ? (
                <p className="text-slate-400 text-sm py-6 text-center">No calculations available. Occupancy details will display once stays commence.</p>
            ) : (
                <div className="space-y-4">
                    {/* Invoice Metadata cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Property Category</span>
                            <span className="font-bold text-slate-700 text-sm">
                                Category {selectedRoom.active_booking?.category_code?.replace('CAT-', '') || 'I'}
                            </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Classification</span>
                            <span className="font-bold text-slate-700 text-sm">{selectedRoom.roomType}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Billed Duration</span>
                            <span className="font-bold text-slate-700 text-sm">{timeline.length} Night(s)</span>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Estimated Total</span>
                            <span className="font-bold text-indigo-700 text-sm">₹{totalBill}</span>
                        </div>
                    </div>

                    {/* Timeline grid mapping nights */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50 p-4">
                        <div className="flex flex-col space-y-2 min-w-max">
                            {/* Header row for dates */}
                            <div className="flex mb-2 border-b border-slate-200 pb-2">
                                <div className="w-48 font-bold text-xs text-slate-500 uppercase shrink-0">Guest Details</div>
                                <div className="flex flex-1">
                                    {timeline.map((day, idx) => (
                                        <div key={idx} className="flex-1 text-center font-bold text-[10px] text-slate-400 w-24 shrink-0 px-1 border-r border-slate-200 last:border-0">
                                            {new Date(day.date).toLocaleDateString([], {month:'short', day:'numeric'})}
                                            <div className="font-mono text-indigo-500 bg-indigo-50 rounded mt-1">₹{day.dailyCharge}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rows for each active guest */}
                            {selectedRoom.guests.filter(g => g.status === 'CHECKED_IN' || g.stay_status === 'CHECKED_IN').map((guest) => (
                                <div key={guest.guestId || guest.guest_id} className="flex items-center group">
                                    <div className="w-48 font-bold text-xs text-slate-700 truncate shrink-0 pr-4" title={guest.name || guest.guest_name}>
                                        {guest.name || guest.guest_name}
                                        <div className="text-[9px] font-normal text-slate-400 font-mono mt-0.5">{guest.stay_status}</div>
                                    </div>
                                    <div className="flex flex-1 relative h-7 bg-white border border-slate-100 rounded-md overflow-hidden shadow-sm">
                                        {timeline.map((day, idx) => {
                                            const isGuestActiveOnDay = day.guestNames.includes(guest.name || guest.guest_name);
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`flex-1 h-full border-r border-slate-50/50 w-24 shrink-0 transition-colors ${isGuestActiveOnDay ? 'bg-indigo-400 group-hover:bg-indigo-500' : 'bg-transparent'}`}
                                                    title={isGuestActiveOnDay ? `Active on ${day.date}` : ''}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
