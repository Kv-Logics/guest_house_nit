import React, { useState, useEffect } from 'react';
import { Loader2, Save, CreditCard } from 'lucide-react';
import api from '../../services/api';

export default function TariffConfigForm() {
    const [tariffs, setTariffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editValues, setEditValues] = useState({});

    const fetchTariffs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/coordinator/tariffs');
            if (res && res.success) {
                setTariffs(res.data);
                const initialEdits = {};
                res.data.forEach(t => {
                    initialEdits[t.tariff_id] = {
                        single_occupancy: t.single_occupancy,
                        double_occupancy: t.double_occupancy,
                        extra_bed: t.extra_bed
                    };
                });
                setEditValues(initialEdits);
            }
        } catch (error) {
            console.error("Failed to fetch tariffs", error);
            alert(`Failed to fetch tariffs: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTariffs();
    }, []);

    const handleChange = (tariffId, field, value) => {
        setEditValues(prev => ({
            ...prev,
            [tariffId]: {
                ...prev[tariffId],
                [field]: value
            }
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const updates = tariffs.map(t => {
                const payload = editValues[t.tariff_id];
                if (!payload || !payload.single_occupancy || !payload.double_occupancy) return null;
                return api.put(`/coordinator/tariffs/${t.tariff_id}`, payload);
            }).filter(Boolean);

            await Promise.all(updates);
            alert('All tariffs successfully updated.');
            fetchTariffs();
        } catch (error) {
            console.error("Failed to update tariffs", error);
            alert('Failed to update tariffs.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-indigo-500" />
                Tariff Configuration
            </h2>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Category</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Room Type</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Single (₹)</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Double (₹)</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Extra Bed (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tariffs.map(t => (
                            <tr key={t.tariff_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="font-bold text-slate-800">{t.category_code}</div>
                                    <div className="text-[10px] text-slate-500">{t.category_description}</div>
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-700">{t.room_type}</td>
                                <td className="px-4 py-4">
                                    <input 
                                        type="number" 
                                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={editValues[t.tariff_id]?.single_occupancy || ''}
                                        onChange={(e) => handleChange(t.tariff_id, 'single_occupancy', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <input 
                                        type="number" 
                                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={editValues[t.tariff_id]?.double_occupancy || ''}
                                        onChange={(e) => handleChange(t.tariff_id, 'double_occupancy', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <input 
                                        type="number" 
                                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={editValues[t.tariff_id]?.extra_bed || ''}
                                        onChange={(e) => handleChange(t.tariff_id, 'extra_bed', e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save All Tariffs
                </button>
            </div>
        </div>
    );
}
