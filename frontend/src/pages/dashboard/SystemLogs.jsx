import React, { useState, useEffect } from 'react';
import { Search, Filter, Database } from 'lucide-react';
import api from '../../services/api';
import { getFormattedBookingId } from '../../utils/booking';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';

export default function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [monthFilter, setMonthFilter] = useState('current');
    const [searchTermInput, setSearchTermInput] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');
    const [previewId, setPreviewId] = useState(null);

    const loadLogs = async (currentOffset = 0, isAppend = false) => {
        try {
            setLoading(true);
            const limit = currentOffset === 0 ? 50 : 100;
            const res = await api.get('/bookings/admin/all', {
                params: { limit, offset: currentOffset, search: activeSearchTerm, month_filter: monthFilter }
            });
            if (res.success) {
                const newItems = res.data.rows;
                if (isAppend) {
                    setLogs(prev => [...prev, ...newItems]);
                } else {
                    setLogs(newItems);
                }
                setHasMore(newItems.length === limit);
            }
        } catch (error) {
            console.error('Failed to load system logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setOffset(0);
        loadLogs(0, false);
    }, [activeSearchTerm, monthFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setActiveSearchTerm(searchTermInput);
    };

    const handleLoadMore = () => {
        const nextOffset = offset + (offset === 0 ? 50 : 100);
        setOffset(nextOffset);
        loadLogs(nextOffset, true);
    };

    return (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">System Master Logs</h2>
                        <p className="text-slate-500 font-medium mt-1">Global timeline of all bookings regardless of status.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search globally..." 
                            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors shadow-sm"
                            value={searchTermInput}
                            onChange={(e) => setSearchTermInput(e.target.value)}
                        />
                        <button type="submit" className="hidden">Search</button>
                    </form>
                    <button
                        type="button"
                        onClick={() => setMonthFilter(prev => prev === 'current' ? 'archive' : 'current')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            monthFilter === 'archive' 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {monthFilter === 'archive' ? 'Viewing Archive' : 'View Archive'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                            <th className="p-4 font-bold">Timeline</th>
                            <th className="p-4 font-bold">Booking ID</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold">Applicant</th>
                            <th className="p-4 font-bold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No logs found.</td>
                            </tr>
                        )}
                        {logs.map(log => (
                            <tr key={log.booking_id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-sm text-slate-600">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="p-4 font-mono text-sm font-bold text-indigo-600">
                                    <button onClick={() => setPreviewId(log.booking_id)} className="hover:underline">
                                        {getFormattedBookingId(log)}
                                    </button>
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase">
                                        {log.booking_state}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-bold text-slate-800">
                                    {log.applicant_name}
                                </td>
                                <td className="p-4 text-sm text-slate-600 truncate max-w-[200px]" title={log.purpose_of_visit}>
                                    {log.purpose_of_visit}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {hasMore && logs.length > 0 && !loading && (
                    <div className="p-4 text-center border-t border-slate-100 bg-slate-50">
                        <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                            Load More Records
                        </button>
                    </div>
                )}
            </div>

            {previewId && <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />}
        </div>
    );
}
