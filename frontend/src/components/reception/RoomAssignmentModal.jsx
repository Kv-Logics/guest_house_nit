import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import RoomMatrix from '../dashboard/RoomMatrix';
import { getFormattedBookingId } from '../../utils/booking';

export default function RoomAssignmentModal({
    isOpen,
    onClose,
    onConfirm,
    arrivalData,
    allRooms,
    isRoomAvailableForDates,
    loading
}) {
    const [assignMode, setAssignMode] = useState(false);
    const [roomAssignments, setRoomAssignments] = useState({});

    useEffect(() => {
        if (isOpen) {
            setAssignMode(false);
            setRoomAssignments({});
        }
    }, [isOpen]);

    if (!isOpen || !arrivalData) return null;

    const handleConfirm = () => {
        // Validate all slots have a room selected
        for (let appRoom of arrivalData.rooms) {
            if (!roomAssignments[appRoom.roomId]) {
                alert(`Please assign a physical room for Room Slot ${appRoom.roomIndex + 1} (${appRoom.roomType}) before confirming.`);
                return;
            }
        }
        const roomListStr = arrivalData.rooms.map(appRoom => roomAssignments[appRoom.roomId]).join(', ');
        onConfirm(roomListStr);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end font-sans">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col transform transition-transform duration-300">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white shrink-0 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Block Room</h2>
                        <p className="text-indigo-200 text-sm">{getFormattedBookingId(arrivalData)} - {arrivalData.applicant}</p>
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-500/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Booking Details</h3>
                    <div className="space-y-4 mb-6">
                        {arrivalData.rooms.map((appRoom, index) => (
                            <div key={appRoom.roomId} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                    <div>
                                        <span className="font-bold text-slate-800">Room Slot {index + 1}</span>
                                        <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{appRoom.roomType}</span>
                                    </div>
                                    {assignMode && (
                                        <select 
                                            value={roomAssignments[appRoom.roomId] || ''}
                                            onChange={e => setRoomAssignments({...roomAssignments, [appRoom.roomId]: e.target.value})}
                                            className="p-1.5 text-xs rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 bg-white"
                                        >
                                            <option value="">Select a physical room...</option>
                                            {allRooms.filter(r => (r.roomType === appRoom.roomType || !appRoom.roomType) && r.status === 'AVAILABLE' && isRoomAvailableForDates(r, arrivalData.rawCheckIn, arrivalData.rawCheckOut)).map(r => (
                                                <option key={r.roomId} value={r.roomId}>Room {r.roomId} ({r.roomType})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {appRoom.guests.map(g => (
                                        <div key={g.guestId} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                                            <span className="font-bold text-xs text-slate-700">{g.name}</span>
                                            <div className="text-[10px] font-mono text-slate-500">
                                                {g.checkIn} <span className="text-slate-300 mx-1">→</span> {g.checkOut}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {assignMode && (
                        <div className="mt-8 border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Select Rooms from Matrix</h3>
                            <RoomMatrix 
                                rooms={allRooms.map(r => {
                                    const matchesAppRoomType = arrivalData.rooms.some(appRoom => !appRoom.roomType || appRoom.roomType === r.roomType);
                                    
                                    const start = new Date(arrivalData.rawCheckIn).getTime();
                                    const end = new Date(arrivalData.rawCheckOut).getTime();
                                    const hasOverlappingBulk = r.future_allocations && r.future_allocations.some(alloc => {
                                        if (!alloc.is_bulk) return false;
                                        const allocStart = new Date(alloc.allocated_from).getTime();
                                        const allocEnd = new Date(alloc.allocated_to).getTime();
                                        return start < allocEnd && end > allocStart;
                                    });

                                    const isFree = r.status === 'AVAILABLE' && isRoomAvailableForDates(r, arrivalData.rawCheckIn, arrivalData.rawCheckOut);
                                    return {
                                        ...r,
                                        status: (isFree && matchesAppRoomType) ? 'AVAILABLE' : (r.status === 'AVAILABLE' ? 'BOOKED' : r.status),
                                        future_allocations: hasOverlappingBulk ? [{
                                            is_bulk: true,
                                            allocated_from: new Date(Date.now() - 86400000).toISOString(),
                                            allocated_to: new Date(Date.now() + 86400000).toISOString()
                                        }] : r.future_allocations
                                    };
                                })} 
                                activeRoomIds={Object.values(roomAssignments)}
                                onRoomClick={(physicalRoomId) => {
                                    const existingSlotId = Object.keys(roomAssignments).find(key => roomAssignments[key] === physicalRoomId);
                                    if (existingSlotId) {
                                        const newAssignments = { ...roomAssignments };
                                        delete newAssignments[existingSlotId];
                                        setRoomAssignments(newAssignments);
                                        return;
                                    }

                                    const physicalRoom = allRooms.find(r => r.roomId === physicalRoomId);
                                    if (!physicalRoom || physicalRoom.status !== 'AVAILABLE' || !isRoomAvailableForDates(physicalRoom, arrivalData.rawCheckIn, arrivalData.rawCheckOut)) return;

                                    const matchesAppRoomType = arrivalData.rooms.some(appRoom => !appRoom.roomType || appRoom.roomType === physicalRoom.roomType);
                                    if (!matchesAppRoomType) return;

                                    const availableSlot = arrivalData.rooms.find(appRoom => {
                                        if (roomAssignments[appRoom.roomId]) return false;
                                        return !appRoom.roomType || appRoom.roomType === physicalRoom.roomType;
                                    });

                                    if (availableSlot) {
                                        setRoomAssignments({ ...roomAssignments, [availableSlot.roomId]: physicalRoomId });
                                    }
                                }}
                                title="Available Rooms for these Dates"
                                showCategories={false}
                            />
                        </div>
                    )}
                </div>
                
                {/* Actions Footer */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                    {!assignMode ? (
                        <div className="flex gap-3">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => setAssignMode(true)}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                            >
                                Allocate Physical Rooms
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setAssignMode(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={loading}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                            >
                                {loading ? 'Saving...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
