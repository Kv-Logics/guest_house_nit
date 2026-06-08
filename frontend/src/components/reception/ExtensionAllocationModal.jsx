import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, AlertTriangle, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const ExtensionAllocationModal = ({ guest, onClose, onComplete }) => {
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState('');

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const res = await receptionService.getRooms();
                if (res.success) {
                    const allRooms = res.data;
                    
                    // Filter rooms to only those of the exact same room type
                    const sameTypeRooms = allRooms.filter(r => r.room_type === guest.current_room_type);

                    const oldCheckout = new Date(guest.old_checkout);
                    const newCheckout = new Date(guest.new_checkout);

                    // Map availability over the extension period
                    const mappedRooms = sameTypeRooms.map(r => {
                        let isAvailable = true;
                        if (r.current_status === 'maintenance') isAvailable = false;
                        
                        // Check active stays and future allocations
                        for (const stay of (r.active_booking?.guests || [])) {
                            // If it's this same guest, we ignore it (we are checking if it's free for extension)
                            if (stay.guest_id === guest.guest_id) continue;
                            const stayEnd = new Date(stay.departure_datetime);
                            const stayStart = new Date(stay.arrival_datetime || stay.checked_in_at);
                            if (stayStart < newCheckout && stayEnd > oldCheckout) {
                                isAvailable = false;
                                break;
                            }
                        }
                        if (isAvailable) {
                            for (const alloc of (r.future_allocations || [])) {
                                if (alloc.booking_id === guest.booking_id) continue;
                                const allocStart = new Date(alloc.allocated_from);
                                const allocEnd = new Date(alloc.allocated_to);
                                if (allocStart < newCheckout && allocEnd > oldCheckout) {
                                    isAvailable = false;
                                    break;
                                }
                            }
                        }

                        return { ...r, isAvailableForExtension: isAvailable };
                    });

                    setAvailableRooms(mappedRooms);
                }
            } catch (err) {
                setError(err.message || 'Failed to load rooms');
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [guest]);

    const handleAllocate = async (roomId, isSameRoom) => {
        try {
            setProcessing(true);
            const res = await receptionService.allocateExtensionRoom(guest.guest_id, roomId, isSameRoom);
            if (res.success) {
                onComplete();
            }
        } catch (err) {
            alert('Failed to allocate room: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    const currentRoomRecord = availableRooms.find(r => r.room_number === guest.current_room);
    const isCurrentRoomAvailable = currentRoomRecord?.isAvailableForExtension;
    const otherAvailableRooms = availableRooms.filter(r => r.isAvailableForExtension && r.room_number !== guest.current_room);

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 p-0 overflow-hidden animate-fade-in">
            <div className="bg-white h-full w-full max-w-lg rounded-l-3xl shadow-2xl overflow-hidden flex flex-col border-l border-slate-200 animate-slide-in-right">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Manage Allocation</h3>
                        <p className="text-sm font-semibold text-slate-700 mt-1">{guest.guest_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="py-12 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p className="text-gray-500">Checking room availability...</p></div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                    ) : (
                        <>
                            <div className="mb-6 p-4 bg-slate-50 border rounded-xl">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Extension Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Current Room</span>
                                        <span className="font-bold text-indigo-700">{guest.current_room} ({guest.current_room_type})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Extension Period</span>
                                        <span className="font-medium text-slate-800">
                                            {new Date(guest.old_checkout).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} 
                                            <span className="mx-1 text-slate-400">→</span> 
                                            {new Date(guest.new_checkout).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Option 1: Continue in Same Room</h4>
                                {isCurrentRoomAvailable ? (
                                    <div className="p-5 border border-emerald-200 bg-emerald-50 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h5 className="font-bold text-emerald-800">Room {guest.current_room} is Available</h5>
                                                <p className="text-sm text-emerald-700 mt-1 mb-4">The guest can continue their stay in the same room without moving.</p>
                                                <button 
                                                    onClick={() => handleAllocate(currentRoomRecord.room_id, true)}
                                                    disabled={processing}
                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    Extend in Current Room
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-rose-200 bg-rose-50 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h5 className="font-bold text-rose-800">Room {guest.current_room} is Not Available</h5>
                                                <p className="text-sm text-rose-700 mt-1">This room is booked by another guest during the extension period. The guest must be transferred to another room of the same type.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Option 2: Transfer Room</h4>
                                <div className="p-5 border border-slate-200 bg-white rounded-xl">
                                    {otherAvailableRooms.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic text-center py-4">No other rooms of type &quot;{guest.current_room_type}&quot; are available.</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-600 mb-4">Select an available room to transfer the guest to. The transfer will be scheduled for the original checkout time.</p>
                                            <select
                                                value={selectedRoomId}
                                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 mb-4 bg-slate-50"
                                            >
                                                <option value="">-- Select Available Room --</option>
                                                {otherAvailableRooms.map(r => (
                                                    <option key={r.room_id} value={r.room_id}>Room {r.room_number}</option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => handleAllocate(selectedRoomId, false)}
                                                disabled={processing || !selectedRoomId}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                Schedule Room Transfer
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExtensionAllocationModal;
