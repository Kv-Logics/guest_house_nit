import React, { useState } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';

export default function RoomTransferModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    transferData, 
    availableRooms,
    loading 
}) {
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setNewRoomNumber('');
            setRemarks('');
        }
    }, [isOpen]);

    if (!isOpen || !transferData) return null;

    const handleSubmit = () => {
        if (!newRoomNumber || !remarks.trim()) return;
        onConfirm({
            stayId: transferData.stayId,
            newRoomNumber,
            remarks,
            isGroup: transferData.isGroup
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5" /> Transfer Room
                        </h2>
                        <p className="text-blue-100 text-xs">
                            {transferData.isGroup 
                                ? `Shifting booking for all active guests in Room ${transferData.currentRoomNumber}` 
                                : `Shifting room for ${transferData.guestName}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-blue-100 hover:text-white p-1 rounded-lg hover:bg-blue-500/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Room</label>
                        <input 
                            type="text" 
                            disabled 
                            value={`Room ${transferData.currentRoomNumber}`}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">New Target Room</label>
                        <select 
                            value={newRoomNumber}
                            onChange={e => setNewRoomNumber(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 bg-slate-50"
                        >
                            <option value="">Select an available room...</option>
                            {availableRooms.map(r => (
                                <option key={r.roomId} value={r.roomId}>
                                    Room {r.roomId} ({r.roomType})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Remarks / Reason</label>
                        <textarea 
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            placeholder="Reason for room transfer..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 placeholder-slate-400 bg-slate-50 resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!newRoomNumber || !remarks.trim() || loading}
                        className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm text-xs"
                    >
                        {loading ? 'Transferring...' : 'Confirm Transfer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
