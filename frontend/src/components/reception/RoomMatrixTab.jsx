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
                    <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200 inline-block"></span> Available</span>
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-yellow-100 border border-yellow-200 inline-block"></span> Occupied</span>
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-red-100 border border-red-200 inline-block"></span> Maintenance</span>
                        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-200 inline-block"></span> Blocked</span>
                    </div>
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
                                    
                                    const startMs = d.getTime();
                                    const endMs = nextDay.getTime();
                                    
                                    let cellBgClass = 'bg-emerald-100 text-emerald-700';
                                    let cellText = 'Available';
                                    
                                    if (room.status === 'MAINTENANCE' || room.status === 'CLEANING') {
                                        cellBgClass = 'bg-red-100 text-red-700';
                                        cellText = 'Maintenance';
                                    } else if (room.future_allocations && room.future_allocations.length > 0) {
                                        const alloc = room.future_allocations.find(a => {
                                            const allocStart = new Date(a.allocated_from).getTime();
                                            const allocEnd = new Date(a.allocated_to).getTime();
                                            return startMs < allocEnd && endMs > allocStart;
                                        });
                                        if (alloc) {
                                            if (alloc.is_bulk) {
                                                cellBgClass = 'bg-blue-100 text-blue-700';
                                                cellText = 'Blocked';
                                            } else {
                                                cellBgClass = 'bg-yellow-100 text-yellow-800';
                                                cellText = 'Occupied';
                                            }
                                        }
                                    }
                                    
                                    return (
                                        <td key={i} className="p-2 border border-slate-200 text-center">
                                            <div className={`w-full h-8 rounded-md flex items-center justify-center font-bold text-[10px] uppercase ${cellBgClass}`}>
                                                {cellText}
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
