import React, { useState } from 'react';
import { Search, Loader2, FileText, User } from 'lucide-react';
import api from '../../services/api';
import { getFormattedBookingId } from '../../utils/booking';
import StatusBadge from '../ui/StatusBadge';

export default function BookingSearchTab({ onViewDetails }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const res = await api.get(`/bookings/admin/all?search=${encodeURIComponent(searchQuery.trim())}&limit=50`);
            setResults(res.rows || []);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in mt-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Search className="w-5 h-5 text-indigo-600" /> Booking Logs & Search
                </h2>
                <p className="text-sm text-slate-500 font-medium mb-4">Search for any past or active booking by ID, guest name, or invoice number to view the complete ledger.</p>
                
                <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
                    <input
                        type="text"
                        placeholder="e.g., NITT-BK-..., John Doe, INV-..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={loading || !searchQuery.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                    </button>
                </form>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : searched && results.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 font-bold">
                        No bookings found matching &quot;{searchQuery}&quot;
                    </div>
                ) : results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4">Booking ID</th>
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4">Dates</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map(booking => (
                                    <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-indigo-600">
                                            {getFormattedBookingId(booking)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{booking.applicant_name}</p>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            {new Date(booking.arrival_datetime).toLocaleDateString()} - {new Date(booking.departure_datetime).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={booking.booking_state} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => onViewDetails(booking.booking_id)}
                                                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 font-bold rounded-lg transition-colors text-xs inline-flex items-center gap-1.5 shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> View Ledger
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
