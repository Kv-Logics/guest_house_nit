import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import RoomMatrix from '../../dashboard/RoomMatrix';
import { receptionService } from '../../../services/reception.service';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { translateRoomsFromBackend } from '../../../utils/receptionUtils';

export default function AddRoomsModal({ isOpen, onClose, booking, currentAllocatedRooms, onRoomsAdded }) {
    const [allRooms, setAllRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedRoomIds, setSelectedRoomIds] = useState([]);

    useEffect(() => {
        if (isOpen && booking) {
            fetchRooms();
        } else {
            setSelectedRoomIds([]);
        }
    }, [isOpen, booking]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getRooms();
            if (res.success) {
                setAllRooms(translateRoomsFromBackend(res.data || []));
            }
        } catch (err) {
            console.error("Failed to fetch rooms for modal", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !booking) return null;

    const handleRoomClick = (roomId) => {
        // Prevent deselecting already allocated rooms
        if (currentAllocatedRooms.includes(roomId)) return;

        setSelectedRoomIds(prev => {
            if (prev.includes(roomId)) return prev.filter(id => id !== roomId);
            return [...prev, roomId];
        });
    };

    const handleSave = async () => {
        if (selectedRoomIds.length === 0) {
            alert("Please select at least one new room to add.");
            return;
        }

        if (!window.confirm(`Are you sure you want to add ${selectedRoomIds.length} room(s) to this bulk booking?`)) return;

        try {
            setSaving(true);
            const res = await bulkBookingApi.addRooms(booking.booking_id, selectedRoomIds);
            if (res.success) {
                if (onRoomsAdded) await onRoomsAdded();
                onClose();
            }
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to add rooms');
        } finally {
            setSaving(false);
        }
    };

    const bookingStart = new Date(booking.arrival_datetime);
    const bookingEnd = new Date(booking.departure_datetime);

    // Filter available rooms strictly for this time period
    const getMatrixRooms = () => {
        return allRooms.map(r => {
            const isAlreadyAllocated = currentAllocatedRooms.includes(String(r.roomId));
            
            // If it's already allocated to this booking, show it distinctly
            if (isAlreadyAllocated) {
                return { ...r, status: 'BOOKED', isBulkBlockedForUs: true };
            }

            // Check if it's available
            const start = bookingStart.getTime();
            const end = bookingEnd.getTime();
            let available = true;

            if (r.future_allocations && r.future_allocations.length > 0) {
                for (const alloc of r.future_allocations) {
                    if (alloc.booking_id === booking.booking_id) continue;
                    const allocStart = new Date(alloc.allocated_from).getTime();
                    const allocEnd = new Date(alloc.allocated_to).getTime();
                    if (start < allocEnd && end > allocStart) {
                        available = false;
                        break;
                    }
                }
            }

            return {
                ...r,
                status: available ? 'AVAILABLE' : 'OCCUPIED'
            };
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Add Rooms to Bulk Booking</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Select additional available rooms to append to this block. 
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm border border-blue-100 flex items-center justify-between">
                                <span>
                                    <strong>Booking Period:</strong> {bookingStart.toLocaleString()} - {bookingEnd.toLocaleString()}
                                </span>
                                <span>
                                    <strong>New Rooms Selected:</strong> <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">{selectedRoomIds.length}</span>
                                </span>
                            </div>
                            
                            <RoomMatrix 
                                rooms={getMatrixRooms()} 
                                activeRoomIds={[...currentAllocatedRooms, ...selectedRoomIds]} 
                                onRoomClick={handleRoomClick} 
                                now={bookingStart}
                                title="Available Rooms for this Period"
                                showCategories={true}
                            />
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || selectedRoomIds.length === 0}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Add {selectedRoomIds.length > 0 ? selectedRoomIds.length : ''} Rooms
                    </button>
                </div>
            </div>
        </div>
    );
}
