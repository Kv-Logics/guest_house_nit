import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function RoomMatrix({ 
    rooms, 
    activeRoomIds = [], // Array to support multi-select if needed
    onRoomClick,
    now = new Date(),
    title = "Property Matrix",
    showCategories = true
}) {
    const [isMatrixOpen, setIsMatrixOpen] = useState(true);
    const [filterCategory, setFilterCategory] = useState('ALL');

    const processedRooms = rooms.map(room => {
        let dynamicStatus = room.status;
        if (dynamicStatus === 'AVAILABLE' || dynamicStatus === undefined) {
            const isRegularBlocked = room.future_allocations && room.future_allocations.some(a => {
                if (a.is_bulk) return false;
                const from = new Date(a.allocated_from);
                const to = new Date(a.allocated_to);
                return now >= from && now <= to;
            });
            if (isRegularBlocked) {
                dynamicStatus = 'BOOKED';
            }
        }
        return { ...room, status: dynamicStatus };
    });

    const availableRoomsList = processedRooms.filter(r => r.status === 'AVAILABLE');
    const bookedRoomsList = processedRooms.filter(r => r.status === 'OCCUPIED' || r.status === 'BOOKED');
    const cleaningRoomsList = processedRooms.filter(r => r.status === 'CLEANING');

    return (
        <div className="w-full animate-fade-in font-sans">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div 
                    className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 cursor-pointer" 
                    onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                >
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                        {title} ({rooms.length} Rooms)
                    </h2>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {isMatrixOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
                
                {isMatrixOpen && (
                    <>
                        {showCategories && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button onClick={() => setFilterCategory('ALL')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'ALL' ? 'bg-slate-800 text-white shadow-md transform -translate-y-0.5' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
                                <button onClick={() => setFilterCategory('AVAILABLE')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-md transform -translate-y-0.5' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Available ({availableRoomsList.length})</button>
                                <button onClick={() => setFilterCategory('OCCUPIED')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'OCCUPIED' ? 'bg-indigo-600 text-white shadow-md transform -translate-y-0.5' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>Booked ({bookedRoomsList.length})</button>
                                <button onClick={() => setFilterCategory('CLEANING')} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${filterCategory === 'CLEANING' ? 'bg-amber-500 text-white shadow-md transform -translate-y-0.5' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>Cleaning ({cleaningRoomsList.length})</button>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-12 gap-1.5 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                            {processedRooms.filter(r => filterCategory === 'ALL' ? true : (filterCategory === 'OCCUPIED' ? (r.status === 'OCCUPIED' || r.status === 'BOOKED') : r.status === filterCategory)).map(room => {
                                const isSelected = activeRoomIds.includes(room.roomId);
                                let bgClass = "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400";
                                if (room.status === 'AVAILABLE') bgClass = "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
                                if (room.status === 'OCCUPIED' || room.status === 'BOOKED') bgClass = "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100";
                                if (room.status === 'CLEANING') bgClass = "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
                                
                                if (isSelected) {
                                    bgClass += " ring-2 ring-indigo-600 ring-offset-2 shadow-lg transform scale-105 z-10";
                                }

                                const hasOverstay = room.guests && room.guests.some(g => {
                                    if (g.stay_status !== 'CHECKED_IN' || !g.rawCheckOut) return false;
                                    return new Date(g.rawCheckOut) < now;
                                });

                                const isBulkBlocked = room.future_allocations && room.future_allocations.some(a => {
                                    if (!a.is_bulk) return false;
                                    const from = new Date(a.allocated_from);
                                    const to = new Date(a.allocated_to);
                                    return now >= from && now <= to;
                                });

                                if (isBulkBlocked) {
                                    bgClass = "bg-slate-200 border-slate-300 text-slate-500 opacity-80 cursor-not-allowed";
                                }

                                return (
                                    <div
                                        key={room.roomId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isBulkBlocked) return;
                                            onRoomClick(room.roomId);
                                        }}
                                        className={`py-1.5 px-1 rounded-lg border transition-colors text-center flex flex-col items-center justify-center relative min-h-[48px] ${bgClass} ${isBulkBlocked ? '' : 'cursor-pointer'}`}
                                        title={isBulkBlocked ? 'Room is Bulk Blocked' : room.roomType}
                                    >
                                        {hasOverstay && (
                                            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white shadow-sm" title="Guest Overstaying!" />
                                        )}
                                        <span className="font-bold text-sm tracking-tight">{room.roomId}</span>
                                        {isBulkBlocked ? (
                                            <span className="text-[7px] font-bold px-1 py-0.5 mt-0.5 rounded leading-none uppercase tracking-wider bg-slate-400 text-white">
                                                BULK BLOCKED
                                            </span>
                                        ) : (
                                            room.roomType && room.roomType.includes('Suite') && (
                                                <span className={`text-[7px] font-bold px-1 py-0.5 mt-0.5 rounded leading-none uppercase tracking-wider ${isSelected ? 'bg-slate-700 text-slate-200' : 'bg-black/10'}`}>
                                                    {room.roomType.replace(' Room', '')}
                                                </span>
                                            )
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
