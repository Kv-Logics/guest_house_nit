import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function RoomMatrixTab({ allRooms, isRoomAvailableForDates }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [daysToShow, setDaysToShow] = useState(7);

    // Generate dates
    const dates = useMemo(() => {
        const d = [];
        const start = new Date(startDate);
        for (let i = 0; i < daysToShow; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            d.push(current);
        }
        return d;
    }, [startDate, daysToShow]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" /> Room Availability Matrix
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Check availability by date and room.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <select
                        value={daysToShow}
                        onChange={(e) => setDaysToShow(parseInt(e.target.value))}
                        className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                    </select>
                </div>
            </div>

            {/* Matrix */}
            <div className="overflow-x-auto p-6">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr>
                            <th className="p-3 text-left font-bold text-slate-500 bg-slate-50 border border-slate-200 sticky left-0 z-10 w-32">Room</th>
                            {dates.map((d, i) => (
                                <th key={i} className="p-3 text-center font-bold text-slate-500 bg-slate-50 border border-slate-200 text-xs min-w-[80px]">
                                    {d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allRooms.map(room => (
                            <tr key={room.roomId || room.room_number} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-slate-700 border border-slate-200 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    {room.room_number || room.roomId}
                                </td>
                                {dates.map((d, i) => {
                                    const nextDay = new Date(d);
                                    nextDay.setDate(d.getDate() + 1);
                                    
                                    const isAvail = isRoomAvailableForDates(room, d.toISOString(), nextDay.toISOString());
                                    
                                    return (
                                        <td key={i} className="p-2 border border-slate-200 text-center">
                                            <div className={`w-full h-8 rounded-md flex items-center justify-center font-bold text-[10px] uppercase ${
                                                isAvail ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {isAvail ? 'Available' : 'Booked'}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
