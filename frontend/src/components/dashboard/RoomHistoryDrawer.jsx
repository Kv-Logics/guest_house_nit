import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Clock, Loader2, ArrowRight } from 'lucide-react';
import { receptionService } from '../../services/reception.service';
import { getFormattedBookingId } from '../../utils/booking';

export default function RoomHistoryDrawer({ roomNumber, isOpen, onClose }) {
    const [history, setHistory] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const drawerRef = useRef(null);

    useEffect(() => {
        if (isOpen && roomNumber) {
            setHistory([]);
            setPage(1);
            setHasMore(true);
            fetchHistory(roomNumber, 1, true);
        }
    }, [isOpen, roomNumber]);

    // Handle ESC key to close drawer
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Handle clicks outside drawer to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
                // If click is not inside the drawer, close it
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const fetchHistory = async (roomNum, targetPage, isReset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await receptionService.getRoomHistory(roomNum, targetPage, 20);
            const data = res.data || [];
            if (data.length < 20) {
                setHasMore(false);
            }
            
            setHistory(prev => isReset ? data : [...prev, ...data]);
        } catch (err) {
            console.error("Failed to load room history:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchHistory(roomNumber, nextPage);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end font-sans bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
            {/* Backdrop cover */}
            <div className="absolute inset-0 bg-transparent" />
            
            {/* Drawer */}
            <div 
                ref={drawerRef}
                className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in border-l border-slate-200"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            Room {roomNumber} History
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Logged historical stays</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {history.length === 0 && !loading ? (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <Clock className="w-10 h-10 text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-600">No History Available</p>
                            <p className="text-xs text-slate-400 mt-1">This room doesn&apos;t have any checked-out stay logs yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((stay, idx) => (
                                <div key={stay.stay_id || idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-slate-300 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                                                BK: {getFormattedBookingId(stay)}
                                            </span>
                                            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                {stay.guest_name}
                                            </span>
                                            {stay.relation_to_applicant && stay.relation_to_applicant !== 'Self' && (
                                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded ml-5">
                                                    Rel: {stay.relation_to_applicant}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 px-2 py-0.5 rounded-full capitalize">
                                            Checked Out
                                        </span>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-600 font-medium">
                                        <div>
                                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Check In</span>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {stay.checked_in_at ? new Date(stay.checked_in_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Check Out</span>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {stay.checked_out_at ? new Date(stay.checked_out_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                                            {stay.occupancy_type || 'Single'} Occupancy
                                        </span>
                                        {stay.extra_bed && (
                                            <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded">
                                                Extra Bed
                                            </span>
                                        )}
                                        {stay.operational_tariff && (
                                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded">
                                                ₹{parseFloat(stay.operational_tariff).toLocaleString('en-IN')}/night
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Loader */}
                    {loading && (
                        <div className="py-4 flex justify-center items-center">
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                    )}

                    {/* Load More Button */}
                    {!loading && hasMore && history.length > 0 && (
                        <button
                            onClick={handleLoadMore}
                            className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                        >
                            Load More Stays
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
