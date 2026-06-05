import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Loader2, Save, Printer, ShieldCheck, AlertCircle, Users, BedDouble, Calendar, CreditCard, ChevronRight, QrCode } from 'lucide-react';
import api from '../../services/api';
import QRScannerModal from '../../components/ui/QRScannerModal';
import GSTInvoiceModal from '../../pages/booking/GSTInvoiceModal';
import InstitutionConfigForm from '../../components/reception/InstitutionConfigForm';

export default function GHCoordinatorDashboard() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

    const [overridePayload, setOverridePayload] = useState(null);
    const [saving, setSaving] = useState(false);
    const [liveTotals, setLiveTotals] = useState({ rooms: 0, extraBeds: 0, food: 0, total: 0 });
    const [showDemoBill, setShowDemoBill] = useState(false);
    const [sortBy, setSortBy] = useState('app_desc');

    useEffect(() => {
        fetchModifiableBookings();
    }, []);

    const fetchModifiableBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/coordinator/bookings');
            setBookings(res.data || []);
        } catch (error) {
            console.error("Failed to fetch coordinator bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of the functions remain the same up to render)

    const fetchBookingDetails = async (id) => {
        setLoadingDetails(true);
        try {
            const res = await api.get(`/coordinator/bookings/${id}`);
            setSelectedBooking(res.data);
            setOverridePayload({
                newRoomType: res.data.room_type,
                newArrival: res.data.arrival_datetime,
                newDeparture: res.data.departure_datetime,
                newTotalAmount: res.data.total_estimated_amount,
                overrideReason: '',
                custom_tariffs: {},
                guestsToUpdate: res.data.guests.map(g => ({
                    guest_id: g.guest_id,
                    departure_datetime: g.departure_datetime,
                    preferred_occupancy: g.preferred_occupancy,
                    preferred_extra_bed: g.preferred_extra_bed,
                    room_index: g.room_index || 0
                }))
            });
        } catch (error) {
            alert('Failed to load booking details.');
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (!selectedBooking || !overridePayload) return;

        let roomsCost = 0;
        let extraBedsCost = 0;
        let foodCost = 0;

        const roomsMap = {};
        overridePayload.guestsToUpdate.forEach(g => {
            const rIdx = g.room_index || 0;
            if (!roomsMap[rIdx]) roomsMap[rIdx] = [];
            roomsMap[rIdx].push(g);
        });

        Object.entries(roomsMap).forEach(([rIdxStr, guestsInRoom]) => {
            const rIdx = parseInt(rIdxStr);
            const checkIn = new Date(overridePayload.newArrival);
            const checkOuts = guestsInRoom.map(g => new Date(g.departure_datetime));
            const maxCheckOut = new Date(Math.max(...checkOuts));
            
            let days = Math.ceil((maxCheckOut - checkIn) / (1000 * 60 * 60 * 24));
            if (days < 1) days = 1;

            const count = guestsInRoom.length;
            let defaultTariff = 800;
            if (overridePayload.newRoomType === 'SUITE') defaultTariff = 2000;
            else if (overridePayload.newRoomType === 'MINI_SUITE') defaultTariff = 1500;
            else {
                if (count === 1) defaultTariff = 800;
                if (count >= 2) defaultTariff = 1000;
            }

            const customRoomTariff = overridePayload.custom_tariffs[rIdx]?.room_rate;
            const tariff = customRoomTariff !== undefined && customRoomTariff !== '' ? parseFloat(customRoomTariff) : defaultTariff;
            
            roomsCost += tariff * days;

            const hasExtraBed = guestsInRoom.some(g => g.preferred_extra_bed);
            if (hasExtraBed) {
                const customEB = overridePayload.custom_tariffs[rIdx]?.extra_bed_rate;
                const ebTariff = customEB !== undefined && customEB !== '' ? parseFloat(customEB) : 400;
                extraBedsCost += ebTariff * days;
            }
        });

        if (selectedBooking.food_preferences) {
            selectedBooking.food_preferences.forEach(fp => {
                if (fp.breakfast > 0) foodCost += 50 * fp.breakfast;
                if (fp.lunch > 0) foodCost += 100 * fp.lunch;
                if (fp.dinner > 0) foodCost += 100 * fp.dinner;
            });
        }

        const total = roomsCost + extraBedsCost + foodCost;
        setLiveTotals({ rooms: roomsCost, extraBeds: extraBedsCost, food: foodCost, total });
        
        // Auto update total amount field if not manually tampered (optional, let's keep it in sync for simplicity)
        setOverridePayload(prev => ({ ...prev, newTotalAmount: total }));
    }, [overridePayload?.guestsToUpdate, overridePayload?.newArrival, overridePayload?.newRoomType, overridePayload?.custom_tariffs, selectedBooking]);


    const handleRoomMove = (idx, newRoomIndex) => {
        let newArr = [...overridePayload.guestsToUpdate];
        newArr[idx].room_index = parseInt(newRoomIndex);

        const roomCounts = {};
        newArr.forEach(g => {
            roomCounts[g.room_index] = (roomCounts[g.room_index] || 0) + 1;
        });

        newArr = newArr.map(g => {
            const count = roomCounts[g.room_index] || 1;
            return {
                ...g,
                preferred_occupancy: count === 1 ? 'single' : 'double',
                preferred_extra_bed: count >= 3
            };
        });

        setOverridePayload({...overridePayload, guestsToUpdate: newArr});
    };


    const handleSearch = (e) => {
        e.preventDefault();
        let cleanId = searchId.trim().toUpperCase();
        if (!cleanId) return;
        
        // Strip APP- prefix if the user pasted it manually from the UI
        if (cleanId.startsWith('APP-')) {
            cleanId = cleanId.replace('APP-', '').trim();
        } else if (cleanId.startsWith('APP ')) {
            cleanId = cleanId.replace('APP ', '').trim();
        }
        
        const found = bookings.find(b => b.booking_id.toUpperCase().includes(cleanId) || b.booking_id.split('-')[0].toUpperCase().includes(cleanId));
        if (found) {
            fetchBookingDetails(found.booking_id);
        } else {
            // Attempt direct fetch
            fetchBookingDetails(cleanId);
        }
    };

    const handleOverrideSubmit = async () => {
        if (!overridePayload.overrideReason) {
            return alert('Please provide a reason for this override.');
        }
        setSaving(true);
        try {
            await api.put(`/coordinator/bookings/${selectedBooking.booking_id}/override`, overridePayload);
            alert('Booking successfully overridden.');
            fetchBookingDetails(selectedBooking.booking_id); // reload
        } catch (error) {
            alert('Failed to apply override.');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateFinalBill = async () => {
        if (!window.confirm("Are you sure? This will lock the bill and send it to Reception.")) return;
        setSaving(true);
        try {
            const billData = {
                subtotal: overridePayload.newTotalAmount * 0.88,
                gst: overridePayload.newTotalAmount * 0.12,
                total: overridePayload.newTotalAmount,
                generated_json: { notes: "Generated by Coordinator", items: [] }
            };
            await api.post(`/coordinator/bookings/${selectedBooking.booking_id}/generate-bill`, billData);
            alert('Final Bill Locked and Sent to Reception!');
            fetchBookingDetails(selectedBooking.booking_id); // reload
        } catch (error) {
            alert('Failed to generate bill.');
        } finally {
            setSaving(false);
        }
    };

    const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'config'

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const sortedBookings = [...bookings].sort((a, b) => {
        const aArr = new Date(a.arrival_datetime || 0).getTime();
        const bArr = new Date(b.arrival_datetime || 0).getTime();
        const aApp = new Date(a.created_at || 0).getTime();
        const bApp = new Date(b.created_at || 0).getTime();

        switch (sortBy) {
            case 'app_desc': return aApp !== bApp ? bApp - aApp : String(b.booking_id).localeCompare(String(a.booking_id));
            case 'app_asc': return aApp !== bApp ? aApp - bApp : String(a.booking_id).localeCompare(String(b.booking_id));
            case 'arr_asc': return aArr - bArr;
            case 'arr_desc': return bArr - aArr;
            default: return bApp - aApp;
        }
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="w-32 h-32" />
                </div>
                <h1 className="text-3xl font-black mb-2 relative z-10 tracking-tight">GH Coordinator Command Center</h1>
                <p className="text-indigo-200 text-lg max-w-2xl relative z-10 font-medium">
                    Extreme manual overrides, bill locking, and operations management.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('operations')}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'operations' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4 inline-block mr-2" /> Operations
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'config' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Save className="w-4 h-4 inline-block mr-2" /> Billing Config
                </button>
            </div>

            <QRScannerModal 
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScanSuccess={(decodedText) => {
                    setIsQRScannerOpen(false);
                    setSearchId(decodedText);
                    fetchBookingDetails(decodedText);
                }}
            />

            {activeTab === 'config' && (
                <InstitutionConfigForm />
            )}

            {activeTab === 'operations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Search & List */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-indigo-500" /> Find Application
                        </h2>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter App ID..."
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                            />
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md">
                                Load
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsQRScannerOpen(true)}
                                className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-md flex items-center justify-center shrink-0"
                                title="Scan Application QR Pass"
                            >
                                <QrCode className="w-5 h-5" />
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 gap-2">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" /> Ops ({bookings.length})
                            </h2>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                            >
                                <option value="app_desc">App Date (New)</option>
                                <option value="app_asc">App Date (Old)</option>
                                <option value="arr_asc">Arrival (Soon)</option>
                                <option value="arr_desc">Arrival (Late)</option>
                            </select>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {sortedBookings.map(b => (
                                <div 
                                    key={b.booking_id}
                                    onClick={() => fetchBookingDetails(b.booking_id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedBooking?.booking_id === b.booking_id ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-slate-800">{b.booking_id?.split('-')[0].toUpperCase()}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${b.booking_state === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {b.booking_state}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium truncate">{b.applicant_name}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{new Date(b.arrival_datetime).toLocaleDateString()} - {b.rooms_required} Room(s)</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Override UI */}
                <div className="lg:col-span-2">
                    {loadingDetails ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                            <p className="text-slate-500 font-medium">Extracting application data...</p>
                        </div>
                    ) : selectedBooking && overridePayload ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full animate-fade-in">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-3">
                                        App {selectedBooking.booking_id?.split('-')[0].toUpperCase()}
                                        {selectedBooking.final_bill && (
                                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1 shadow-sm">
                                                <ShieldCheck className="w-3 h-3" /> BILL LOCKED
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-500">{selectedBooking.applicant_name} ({selectedBooking.applicant_email})</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                                    <p className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{selectedBooking.booking_state}</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                                {/* Global Overrides */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Calendar className="w-4 h-4 text-indigo-500" /> Global Override Settings
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Room Category / Type</label>
                                            <select 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={overridePayload.newRoomType}
                                                onChange={(e) => setOverridePayload({...overridePayload, newRoomType: e.target.value})}
                                            >
                                                <option value="Standard Room">Standard Room</option>
                                                <option value="Mini Suite Room">Mini Suite Room</option>
                                                <option value="Suite Room">Suite Room</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Total Estimated Amount (₹)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={overridePayload.newTotalAmount}
                                                onChange={(e) => setOverridePayload({...overridePayload, newTotalAmount: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Guest Specific Overrides */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Users className="w-4 h-4 text-indigo-500" /> Guest Stay Operations
                                    </h3>
                                    <div className="space-y-4">
                                        {(() => {
                                            const roomsMap = {};
                                            overridePayload.guestsToUpdate.forEach((gPayload, idx) => {
                                                const rIdx = gPayload.room_index || 0;
                                                if (!roomsMap[rIdx]) roomsMap[rIdx] = [];
                                                roomsMap[rIdx].push({ gPayload, idx });
                                            });

                                            const maxRoomIndex = Math.max(0, ...Object.keys(roomsMap).map(Number));

                                            return Object.entries(roomsMap).map(([rIdxStr, guestsInRoom]) => {
                                                const rIdx = parseInt(rIdxStr);
                                                const count = guestsInRoom.length;
                                                let occLabel = 'Single';
                                                if (count === 2) occLabel = 'Double';
                                                if (count >= 3) occLabel = 'Double + Extra Bed';

                                                return (
                                                    <div key={rIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                            <span className="font-black text-slate-700 text-sm">Room {rIdx + 1}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{occLabel}</span>
                                                        </div>
                                                        <div className="bg-white px-4 py-3 border-b border-slate-100 flex gap-6">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Manual Room Rate (₹/day)</label>
                                                                <input 
                                                                    type="number"
                                                                    placeholder="Auto"
                                                                    className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    value={overridePayload.custom_tariffs[rIdx]?.room_rate || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setOverridePayload(prev => ({
                                                                            ...prev,
                                                                            custom_tariffs: { ...prev.custom_tariffs, [rIdx]: { ...prev.custom_tariffs[rIdx], room_rate: val } }
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Manual Extra Bed (₹/day)</label>
                                                                <input 
                                                                    type="number"
                                                                    placeholder="Auto (400)"
                                                                    className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    value={overridePayload.custom_tariffs[rIdx]?.extra_bed_rate || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setOverridePayload(prev => ({
                                                                            ...prev,
                                                                            custom_tariffs: { ...prev.custom_tariffs, [rIdx]: { ...prev.custom_tariffs[rIdx], extra_bed_rate: val } }
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            {guestsInRoom.map(({ gPayload, idx }) => {
                                                                const originalGuest = selectedBooking.guests.find(g => g.guest_id === gPayload.guest_id);
                                                                return (
                                                                    <div key={gPayload.guest_id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="font-bold text-sm text-slate-800">{originalGuest.guest_name}</span>
                                                                            <span className="text-xs text-slate-500">{originalGuest.relation_to_applicant}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Move to Room</label>
                                                                                <select 
                                                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                    value={gPayload.room_index}
                                                                                    onChange={(e) => handleRoomMove(idx, e.target.value)}
                                                                                >
                                                                                    {Array.from({ length: maxRoomIndex + 2 }).map((_, i) => (
                                                                                        <option key={i} value={i}>Room {i + 1} {i > maxRoomIndex ? '(New Room)' : ''}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Checkout Date</label>
                                                                                <input 
                                                                                    type="datetime-local"
                                                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                    value={new Date(gPayload.departure_datetime).toISOString().slice(0, 16)}
                                                                                    onChange={(e) => {
                                                                                        const newArr = [...overridePayload.guestsToUpdate];
                                                                                        newArr[idx].departure_datetime = new Date(e.target.value).toISOString();
                                                                                        setOverridePayload({...overridePayload, guestsToUpdate: newArr});
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Live Billing Preview */}
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm">
                                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-indigo-600" /> Live Billing Preview
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rooms Total</p>
                                            <p className="text-base font-black text-indigo-700">₹{liveTotals.rooms.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extra Beds</p>
                                            <p className="text-base font-black text-indigo-700">₹{liveTotals.extraBeds.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Food Total</p>
                                            <p className="text-base font-black text-indigo-700">₹{liveTotals.food.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-indigo-600 p-3 rounded-xl border border-indigo-500 shadow-md text-center">
                                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Live Subtotal</p>
                                            <p className="text-lg font-black text-white">₹{liveTotals.total.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-indigo-700/80 font-semibold">* The 'Total Estimated Amount' above is automatically synced with this value, but can be manually overridden if you need to apply a custom discount or lump sum.</p>
                                </div>


                                {/* Security Justification */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <label className="block text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Mandatory Override Reason (Audit Log)
                                    </label>
                                    <textarea 
                                        rows="2"
                                        placeholder="Explain why these rates or details were manually altered..."
                                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-amber-300 text-amber-900"
                                        value={overridePayload.overrideReason}
                                        onChange={(e) => setOverridePayload({...overridePayload, overrideReason: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
                                <button 
                                    onClick={handleOverrideSubmit}
                                    disabled={saving || !overridePayload.overrideReason}
                                    className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-900 hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Override Changes
                                </button>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setShowDemoBill(true)}
                                        className="px-6 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Preview Demo Bill
                                    </button>

                                    <button 
                                        onClick={handleGenerateFinalBill}
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                        {selectedBooking.final_bill ? 'Regenerate & Lock Bill' : 'Lock Bill & Send to Reception'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center">
                            <QrCode className="w-16 h-16 mb-4 text-slate-300" />
                            <p className="font-bold">Scan or enter an Application ID to load details.</p>
                        </div>
                    )}
                </div>
            </div>
            )}
            
            
            {showDemoBill && (
                <GSTInvoiceModal 
                    bookingId={selectedBooking?.booking_id} 
                    bookingData={{
                        ...selectedBooking,
                        room_type: overridePayload?.newRoomType || selectedBooking?.room_type,
                        arrival_datetime: overridePayload?.newArrival || selectedBooking?.arrival_datetime,
                        departure_datetime: overridePayload?.newDeparture || selectedBooking?.departure_datetime,
                        total_estimated_amount: overridePayload?.newTotalAmount || selectedBooking?.total_estimated_amount,
                        final_bill: null // Force it to use the newTotalAmount instead of any saved final_bill
                    }} 
                    onClose={() => setShowDemoBill(false)} 
                />
            )}
        </div>
    );
}
