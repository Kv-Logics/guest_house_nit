import React, { useState } from 'react';
import { Save, PlusCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function AddRoomForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [roomData, setRoomData] = useState({
        room_number: '',
        block_name: 'Main Block',
        floor_number: '0',
        room_type: 'Standard Room',
        capacity: '2',
        has_ac: true,
        tariffs: {
            1: { single: '1000', double: '1600', extra_bed: '400' },
            2: { single: '1100', double: '1800', extra_bed: '400' },
            3: { single: '1200', double: '2000', extra_bed: '400' },
            4: { single: '2600', double: '2600', extra_bed: '400' }
        }
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRoomData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTariffChange = (catId, field, value) => {
        setRoomData(prev => ({
            ...prev,
            tariffs: {
                ...prev.tariffs,
                [catId]: {
                    ...prev.tariffs[catId],
                    [field]: value
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await api.post('/coordinator/rooms', roomData);
            if (res.success) {
                setMessage({ type: 'success', text: 'Room and Tariffs successfully configured in database!' });
                setRoomData({
                    room_number: '',
                    block_name: 'Main Block',
                    floor_number: '0',
                    room_type: 'Standard Room',
                    capacity: '2',
                    has_ac: true,
                    tariffs: {
                        1: { single: '1000', double: '1600', extra_bed: '400' },
                        2: { single: '1100', double: '1800', extra_bed: '400' },
                        3: { single: '1200', double: '2000', extra_bed: '400' },
                        4: { single: '2600', double: '2600', extra_bed: '400' }
                    }
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || error.message || 'Failed to add room' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-indigo-500" />
                Add New Room & Set Tariffs
            </h2>

            {message && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Room Number *</label>
                        <input
                            type="text"
                            name="room_number"
                            required
                            placeholder="e.g. 101, B3"
                            value={roomData.room_number}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Block Name *</label>
                        <input
                            type="text"
                            name="block_name"
                            required
                            placeholder="e.g. Main Block"
                            value={roomData.block_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Floor Number *</label>
                        <select
                            name="floor_number"
                            value={roomData.floor_number}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="0">Ground Floor</option>
                            <option value="1">First Floor</option>
                            <option value="2">Second Floor</option>
                            <option value="3">Third Floor</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Room Type *</label>
                        <select
                            name="room_type"
                            value={roomData.room_type}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="Standard Room">Standard Room</option>
                            <option value="Mini Suite Room">Mini Suite Room</option>
                            <option value="Suite Room">Suite Room</option>
                            <option value="Renovated Room">Renovated Room</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Capacity *</label>
                        <input
                            type="number"
                            name="capacity"
                            required
                            min="1"
                            value={roomData.capacity}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center pt-6">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="has_ac"
                                checked={roomData.has_ac}
                                onChange={handleChange}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm font-semibold text-slate-700">Has Air Conditioning (AC)</span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">Configure Tariffs for Room Type: {roomData.room_type}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(catId => {
                            const labels = { 1: 'CAT I', 2: 'CAT II', 3: 'CAT III', 4: 'CAT IV' };
                            return (
                                <div key={catId} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    <h4 className="font-bold text-indigo-700 text-sm">{labels[catId]}</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Single Occupancy (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={roomData.tariffs[catId].single}
                                            onChange={(e) => handleTariffChange(catId, 'single', e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Double Occupancy (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={roomData.tariffs[catId].double}
                                            onChange={(e) => handleTariffChange(catId, 'double', e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Extra Bed (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={roomData.tariffs[catId].extra_bed}
                                            onChange={(e) => handleTariffChange(catId, 'extra_bed', e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Room & Tariffs
                    </button>
                </div>
            </form>
        </div>
    );
}
