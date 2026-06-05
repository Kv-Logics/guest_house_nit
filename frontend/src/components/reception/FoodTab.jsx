import React from 'react';
import { Utensils } from 'lucide-react';

export default function FoodTab({
    bookingData,
    foodFilterDate,
    setFoodFilterDate
}) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in w-full font-sans">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Utensils className="w-6 h-6 text-indigo-500" /> Food Requirements
                </h2>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-600">Select Date:</label>
                    <input 
                        type="date" 
                        value={foodFilterDate}
                        onChange={(e) => setFoodFilterDate(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 bg-slate-50"
                    />
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-550 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="p-4">Room</th>
                            <th className="p-4">Guest Name</th>
                            <th className="p-4 text-center">Breakfast</th>
                            <th className="p-4 text-center">Lunch</th>
                            <th className="p-4 text-center">Dinner</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                        {(() => {
                            let foodRows = [];
                            (bookingData.rooms || []).forEach(room => {
                                if (room.status === 'OCCUPIED' || room.status === 'AVAILABLE' || room.status === 'CLEANING') {
                                    const activeStays = room.guests;
                                    (activeStays || []).forEach(guest => {
                                        if (guest.stay_status === 'CHECKED_IN' || guest.status === 'CHECKED_IN') {
                                            const currentFilterDateStr = new Date(foodFilterDate).toDateString();
                                            const checkInDate = new Date(guest.rawCheckIn);
                                            const checkOutDate = new Date(guest.rawCheckOut);

                                            const staysOnFilterDate = new Date(foodFilterDate) >= new Date(checkInDate.toDateString()) &&
                                                                      new Date(foodFilterDate) <= new Date(checkOutDate.toDateString());

                                            if (staysOnFilterDate) {
                                                const formattedPref = (guest.food_preferences || []).map(p => p.trim().toLowerCase());
                                                const hasBreakfast = formattedPref.includes('breakfast');
                                                const hasLunch = formattedPref.includes('lunch');
                                                const hasDinner = formattedPref.includes('dinner');

                                                if (hasBreakfast || hasLunch || hasDinner) {
                                                    foodRows.push(
                                                        <tr key={guest.guestId || guest.guest_id} className="hover:bg-slate-50/50">
                                                            <td className="p-4 font-bold text-indigo-650">Room {room.roomId}</td>
                                                            <td className="p-4">{guest.name}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${hasBreakfast ? 'bg-emerald-100 text-emerald-850' : 'text-slate-350 bg-slate-50'}`}>
                                                                    {hasBreakfast ? 'Veg' : 'No'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${hasLunch ? 'bg-emerald-100 text-emerald-850' : 'text-slate-350 bg-slate-50'}`}>
                                                                    {hasLunch ? 'Veg' : 'No'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${hasDinner ? 'bg-emerald-100 text-emerald-850' : 'text-slate-350 bg-slate-50'}`}>
                                                                    {hasDinner ? 'Veg' : 'No'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            }
                                        }
                                    });
                                }
                            });

                            if (foodRows.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">
                                            No food requirements requested for this date.
                                        </td>
                                    </tr>
                                );
                            }
                            return foodRows;
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
