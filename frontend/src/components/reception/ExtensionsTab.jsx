import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, AlertTriangle, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import ExtensionAllocationModal from './ExtensionAllocationModal';

const ExtensionsTab = () => {
    const [pendingExtensions, setPendingExtensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGuest, setSelectedGuest] = useState(null);

    const loadExtensions = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getPendingExtensionAllocations();
            if (res.success) {
                setPendingExtensions(res.data);
            }
        } catch (err) {
            setError(err.message || 'Failed to load extensions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExtensions();
    }, []);

    const handleAllocationComplete = () => {
        setSelectedGuest(null);
        loadExtensions();
    };

    const handleTransfer = async (guestId) => {
        if (!window.confirm('Execute room transfer for this guest? This will end their current stay and start the new room stay.')) return;
        try {
            const res = await receptionService.executeRoomTransfer(guestId);
            if (res.success) {
                alert('Transfer executed successfully.');
                loadExtensions();
            }
        } catch (err) {
            alert('Failed to execute transfer: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><p className="text-gray-500">Loading extensions...</p></div>;

    const needsAllocation = pendingExtensions.filter(g => !g.new_room_number);
    const needsTransfer = pendingExtensions.filter(g => g.new_room_number && g.new_room_number !== g.current_room);

    return (
        <div className="p-6 font-sans">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Stay Extensions</h2>
                <p className="text-slate-500 text-sm mt-1">Manage room allocations and transfers for approved stay extensions.</p>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6 text-sm font-medium">{error}</div>}

            {/* Needs Allocation Section */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Pending Room Allocation ({needsAllocation.length})
                </h3>
                {needsAllocation.length === 0 ? (
                    <div className="p-6 bg-slate-50 border rounded-xl text-center text-slate-500">No extensions pending room allocation.</div>
                ) : (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Room</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Old Checkout</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">New Checkout</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {needsAllocation.map((g) => (
                                    <tr key={g.guest_id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span className="font-semibold text-slate-800">{g.guest_name}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 ml-6 mt-0.5">Booking: {g.formatted_id || g.booking_id.substring(0,8)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-indigo-600">{g.current_room || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-amber-600">
                                            {new Date(g.old_checkout).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                                            {new Date(g.new_checkout).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedGuest(g)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm transition-colors shadow-sm"
                                            >
                                                Manage Allocation
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Needs Transfer Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    Pending Room Transfers ({needsTransfer.length})
                </h3>
                {needsTransfer.length === 0 ? (
                    <div className="p-6 bg-slate-50 border rounded-xl text-center text-slate-500">No pending room transfers.</div>
                ) : (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Detail</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {needsTransfer.map((g) => {
                                    const isTransferTime = new Date() >= new Date(g.old_checkout);
                                    return (
                                        <tr key={g.guest_id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <span className="font-semibold text-slate-800">{g.guest_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-mono font-bold text-sm">Room {g.current_room}</span>
                                                    <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded font-mono font-bold text-sm">Room {g.new_room_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {new Date(g.old_checkout).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                                                {!isTransferTime && (
                                                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Waiting for checkout time
                                                    </span>
                                                )}
                                                <button 
                                                    onClick={() => handleTransfer(g.guest_id)}
                                                    disabled={!isTransferTime}
                                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2 ${isTransferTime ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                >
                                                    <ArrowRightLeft className="h-4 w-4" />
                                                    Execute Transfer
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedGuest && (
                <ExtensionAllocationModal
                    guest={selectedGuest}
                    onClose={() => setSelectedGuest(null)}
                    onComplete={handleAllocationComplete}
                />
            )}
        </div>
    );
};

export default ExtensionsTab;
