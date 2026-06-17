import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Lock, Save, FileText, CheckCircle2, User, Users, Bed, Calendar as CalendarIcon, DollarSign, X, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { ROLES, BULK_BOOKING_STATUS_LABELS } from '../../../utils/constants';

// Helper to format date to YYYY-MM-DD
const formatDateStr = (date) => new Date(date).toISOString().split('T')[0];

export default function BulkStayLedger({ booking }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({
        guest_name: '',
        room_number: '',
        check_in: formatDateStr(new Date()),
        check_out: formatDateStr(new Date(Date.now() + 86400000)),
        occupancy_type: 'single',
        extra_bed: false,
        tariff_per_night: 0,
        remarks: ''
    });

    const [isGrouping, setIsGrouping] = useState(false);
    const [billGroups, setBillGroups] = useState([]);
    const [recordAssignments, setRecordAssignments] = useState([]);

    const bookingId = booking.booking_id;
    const isLocked = booking.stay_locked_at !== null;
    const isGhc = [ROLES.GH_COORDINATOR, ROLES.RECEPTION, ROLES.SUPER_ADMIN].includes(user.role);

    // Fetch rooms allocated
    const allocatedRooms = booking.allocated_room_numbers ? booking.allocated_room_numbers.split(',').map(r => r.trim()).filter(Boolean) : [];

    const { data, isLoading } = useQuery({
        queryKey: ['bulkStayRecords', bookingId],
        queryFn: async () => {
            const res = await api.get(`/bookings/bulk/${bookingId}/stay-records`);
            return res.data;
        }
    });

    const records = data?.records || [];
    const savedGroups = data?.groups || [];

    // Mutations
    const saveRecord = useMutation({
        mutationFn: async (payload) => {
            if (editingRecord) {
                return await api.put(`/bookings/bulk/${bookingId}/stay-records/${editingRecord.record_id}`, payload);
            }
            return await api.post(`/bookings/bulk/${bookingId}/stay-records`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['bulkStayRecords', bookingId]);
            setIsAdding(false);
            setEditingRecord(null);
            setFormData({ guest_name: '', room_number: '', check_in: formatDateStr(new Date()), check_out: formatDateStr(new Date(Date.now() + 86400000)), occupancy_type: 'single', extra_bed: false, tariff_per_night: 0, remarks: '' });
        },
        onError: (err) => alert(err.response?.data?.message || 'Error saving record')
    });

    const deleteRecord = useMutation({
        mutationFn: async (recordId) => {
            if (!confirm('Delete this stay record?')) throw new Error('Cancelled');
            return await api.delete(`/bookings/bulk/${bookingId}/stay-records/${recordId}`);
        },
        onSuccess: () => queryClient.invalidateQueries(['bulkStayRecords', bookingId]),
        onError: (err) => { if(err.message !== 'Cancelled') alert(err.response?.data?.message || 'Error deleting record') }
    });

    const saveGroups = useMutation({
        mutationFn: async () => {
            // Calculate subtotals
            const groupData = billGroups.map(bg => {
                const groupRecords = records.filter(r => recordAssignments.find(a => a.recordId === r.record_id && a.groupLabel === bg.label));
                const subtotal = groupRecords.reduce((sum, r) => sum + Number(r.total_amount), 0);
                const gst = subtotal * 0.12; // Assuming 12% GST
                const total = subtotal + gst;
                return { ...bg, subtotal, gst, total };
            });
            return await api.post(`/bookings/bulk/${bookingId}/stay-records/bill-groups`, { groups: groupData, recordAssignments });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['bulkStayRecords', bookingId]);
            setIsGrouping(false);
            alert('Bill groups saved successfully.');
        },
        onError: (err) => alert(err.response?.data?.message || 'Error saving groups')
    });

    const lockRecords = useMutation({
        mutationFn: async () => {
            if (!confirm('Are you sure you want to lock all stay records? This will generate the final bills and prevent any further edits.')) throw new Error('Cancelled');
            return await api.post(`/bookings/bulk/${bookingId}/stay-records/lock`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['bulkStayRecords', bookingId]);
            alert('Stay records locked and bills generated.');
            window.location.reload(); // Refresh to update booking status globally
        },
        onError: (err) => {
            if(err.message !== 'Cancelled') alert(err.response?.data?.message || 'Error locking records');
        }
    });

    // Initialize grouping state when starting grouping
    useEffect(() => {
        if (isGrouping && billGroups.length === 0 && savedGroups.length === 0) {
            setBillGroups([{ label: 'A', name: 'Group A' }]);
            setRecordAssignments(records.map(r => ({ recordId: r.record_id, groupLabel: 'A' })));
        } else if (isGrouping && savedGroups.length > 0) {
            setBillGroups(savedGroups.map(g => ({ label: g.group_label, name: g.group_name })));
            setRecordAssignments(records.map(r => ({ recordId: r.record_id, groupLabel: r.bill_group_label || savedGroups[0].group_label })));
        }
    }, [isGrouping, savedGroups, records]);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        saveRecord.mutate(formData);
    };

    const handleEdit = (rec) => {
        setEditingRecord(rec);
        setFormData({
            guest_name: rec.guest_name,
            room_number: rec.room_number,
            check_in: formatDateStr(rec.check_in),
            check_out: formatDateStr(rec.check_out),
            occupancy_type: rec.occupancy_type,
            extra_bed: rec.extra_bed,
            tariff_per_night: rec.tariff_per_night,
            remarks: rec.remarks || ''
        });
        setIsAdding(true);
    };

    // Prepare group previews
    const getGroupPreview = (label) => {
        const assignments = isGrouping ? recordAssignments : records.map(r => ({ recordId: r.record_id, groupLabel: r.bill_group_label }));
        const groupRecords = records.filter(r => assignments.find(a => a.recordId === r.record_id && a.groupLabel === label));
        const subtotal = groupRecords.reduce((sum, r) => sum + Number(r.total_amount), 0);
        const gst = subtotal * 0.12;
        return { records: groupRecords, subtotal, gst, total: subtotal + gst };
    };

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>;

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Stay Records Ledger
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {isLocked ? 'Records are locked and bills have been generated.' : 'Manage individual guest stays and group them into bills.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-bold rounded-lg border border-amber-200">
                            <Lock className="w-4 h-4" /> Locked
                        </span>
                    ) : (
                        <>
                            {!isGrouping && !isAdding && (
                                <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                    <Plus className="w-4 h-4" /> Add Record
                                </button>
                            )}
                            {!isGrouping && !isAdding && records.length > 0 && (
                                <button onClick={() => setIsGrouping(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
                                    <Users className="w-4 h-4" /> Bill Grouping
                                </button>
                            )}
                            {isGhc && records.length > 0 && savedGroups.length > 0 && !isGrouping && (
                                <button onClick={() => lockRecords.mutate()} disabled={lockRecords.isLoading} className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50">
                                    {lockRecords.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} 
                                    Lock & Generate Bills
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add / Edit Form */}
            {isAdding && !isLocked && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 relative">
                    <button onClick={() => { setIsAdding(false); setEditingRecord(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                    <h4 className="text-md font-bold text-slate-800 mb-4">{editingRecord ? 'Edit Stay Record' : 'Add Stay Record'}</h4>
                    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Guest Name</label>
                            <input type="text" required value={formData.guest_name} onChange={e => setFormData({...formData, guest_name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. Dr. Ramesh" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Room Number</label>
                            <select required value={formData.room_number} onChange={e => setFormData({...formData, room_number: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                <option value="">Select Room</option>
                                {allocatedRooms.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Check-in Date</label>
                            <input type="date" required value={formData.check_in} onChange={e => setFormData({...formData, check_in: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Check-out Date</label>
                            <input type="date" required value={formData.check_out} onChange={e => setFormData({...formData, check_out: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Tariff Per Night (₹)</label>
                            <input type="number" required min="0" step="0.01" value={formData.tariff_per_night} onChange={e => setFormData({...formData, tariff_per_night: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Occupancy</label>
                            <select value={formData.occupancy_type} onChange={e => setFormData({...formData, occupancy_type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                                <option value="single">Single</option>
                                <option value="double">Double</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 flex items-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formData.extra_bed} onChange={e => setFormData({...formData, extra_bed: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                                <span className="text-sm font-bold text-slate-700">Needs Extra Bed?</span>
                            </label>
                        </div>
                        
                        <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                            <button type="submit" disabled={saveRecord.isLoading} className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50">
                                {saveRecord.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                                {editingRecord ? 'Update Record' : 'Save Record'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bill Grouping Interface */}
            {isGrouping && !isLocked && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                        <h4 className="text-lg font-bold text-slate-800">Create Bill Groups</h4>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                const nextLabel = String.fromCharCode(65 + billGroups.length);
                                setBillGroups([...billGroups, { label: nextLabel, name: `Group ${nextLabel}` }]);
                            }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50">
                                <Plus className="w-4 h-4" /> Add Group
                            </button>
                            <button onClick={() => setIsGrouping(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={() => saveGroups.mutate()} disabled={saveGroups.isLoading} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 shadow-sm">
                                {saveGroups.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Groups
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Group Definitions */}
                        <div className="col-span-1 space-y-3">
                            <h5 className="text-sm font-bold text-slate-600 uppercase">Groups</h5>
                            {billGroups.map(bg => (
                                <div key={bg.label} className="flex gap-2 items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">{bg.label}</div>
                                    <input type="text" value={bg.name} onChange={(e) => {
                                        const newGroups = [...billGroups];
                                        newGroups.find(g => g.label === bg.label).name = e.target.value;
                                        setBillGroups(newGroups);
                                    }} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="Group Name (e.g. Physics Dept)" />
                                </div>
                            ))}
                        </div>

                        {/* Record Assignments */}
                        <div className="col-span-1 md:col-span-2 space-y-3">
                            <h5 className="text-sm font-bold text-slate-600 uppercase">Assign Records to Groups</h5>
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-2">Guest & Room</th>
                                            <th className="px-4 py-2">Assign To Group</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {records.map(r => (
                                            <tr key={r.record_id}>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-800">{r.guest_name}</div>
                                                    <div className="text-xs text-slate-500">Room {r.room_number} • {r.nights}N</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select value={recordAssignments.find(a => a.recordId === r.record_id)?.groupLabel || 'A'} onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRecordAssignments(prev => prev.map(a => a.recordId === r.record_id ? { ...a, groupLabel: val } : a));
                                                    }} className="w-full px-2 py-1 border border-slate-300 rounded bg-slate-50">
                                                        {billGroups.map(bg => <option key={bg.label} value={bg.label}>Group {bg.label} ({bg.name})</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stay Records List */}
            {!isGrouping && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {records.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Bed className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="font-bold">No stay records added yet.</p>
                            <p className="text-sm mt-1">Add records to start building the bill ledger.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Guest & Room</th>
                                        <th className="px-4 py-3">Dates & Nights</th>
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Bill Group</th>
                                        <th className="px-4 py-3 text-right">Amount (₹)</th>
                                        {!isLocked && <th className="px-4 py-3 text-center">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.map(r => (
                                        <tr key={r.record_id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{r.guest_name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Bed className="w-3 h-3" /> Room {r.room_number}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{formatDateStr(r.check_in)} to {formatDateStr(r.check_out)}</div>
                                                <div className="text-xs text-slate-500">{r.nights} Nights</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="capitalize font-medium text-slate-700">{r.occupancy_type}</div>
                                                {r.extra_bed && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Extra Bed</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.bill_group_label ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                                                        {r.bill_group_label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="font-bold text-slate-800">₹{Number(r.total_amount).toFixed(2)}</div>
                                                <div className="text-xs text-slate-500">@ ₹{Number(r.tariff_per_night).toFixed(2)}/nt</div>
                                            </td>
                                            {!isLocked && (
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteRecord.mutate(r.record_id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Bill Previews */}
            {!isGrouping && (savedGroups.length > 0 || isGrouping) && (
                <div className="mt-8 space-y-4">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Bill Summaries
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(savedGroups.length > 0 ? savedGroups.map(g => ({ label: g.group_label, name: g.group_name })) : billGroups).map(bg => {
                            const preview = getGroupPreview(bg.label);
                            const finalGroup = savedGroups.find(g => g.group_label === bg.label);
                            
                            return (
                                <div key={bg.label} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                        <div className="font-bold text-slate-800">Bill Group {bg.label}</div>
                                        {finalGroup?.invoice_number && (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
                                                {finalGroup.invoice_number}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 border-b border-slate-100 bg-white">
                                        <div className="text-sm font-bold text-indigo-700">{bg.name}</div>
                                        <div className="text-xs text-slate-500">{preview.records.length} Guests</div>
                                    </div>
                                    <div className="p-4 flex-1">
                                        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {preview.records.map(r => (
                                                <div key={r.record_id} className="flex justify-between text-sm">
                                                    <span className="text-slate-600 truncate mr-2">{r.guest_name} ({r.nights}N)</span>
                                                    <span className="text-slate-800 font-medium shrink-0">₹{Number(r.total_amount).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 font-medium">Subtotal</span>
                                            <span className="text-slate-700 font-bold">₹{preview.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 font-medium">GST (12%)</span>
                                            <span className="text-slate-700 font-bold">₹{preview.gst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-base pt-2 border-t border-slate-200 mt-2">
                                            <span className="text-slate-800 font-bold">Total Bill</span>
                                            <span className="text-indigo-700 font-black">₹{preview.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
}
