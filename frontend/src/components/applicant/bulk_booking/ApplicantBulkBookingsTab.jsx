import React, { useState, useEffect } from 'react';
import { Users, FileText, Search, Loader2, RefreshCw, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../../services/booking.service';
import StatusBadge from '../../ui/StatusBadge';
import { getFormattedBookingId } from '../../../utils/booking';
import ApplicantBulkBookingDetail from './ApplicantBulkBookingDetail';

export default function ApplicantBulkBookingsTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['myBulkBookings'],
        queryFn: bookingService.getMyBookings
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-indigo-600">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-10 text-red-500 font-bold">Failed to load bulk bookings.</div>;
    }

    // Filter to only include bulk bookings
    const bulkBookings = (data?.data || []).filter(b => b.booking_type === 'BULK_BOOKING');
    
    const filteredBookings = bulkBookings.filter(b => {
        const term = searchTerm.toLowerCase();
        return b.booking_id.toLowerCase().includes(term) || 
               (b.bulk_booking_metadata?.event_name && b.bulk_booking_metadata.event_name.toLowerCase().includes(term));
    });

    if (selectedBookingId) {
        return (
            <ApplicantBulkBookingDetail 
                bookingId={selectedBookingId} 
                onBack={() => setSelectedBookingId(null)} 
            />
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        My Bulk Bookings
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Conferences, Events, and Group Stays</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search event or ID..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                </div>
            </div>

            {filteredBookings.length === 0 ? (
                <div className="text-center py-20 bg-slate-50">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Bulk Bookings Found</h3>
                    <p className="text-slate-500 mb-6">Bulk bookings are created by reception on your behalf.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4">Reference & Event</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Expected Guests</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBookings.map(b => (
                                <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-mono text-xs text-slate-500 font-bold">{getFormattedBookingId(b)}</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{b.bulk_booking_metadata?.event_name || 'Group Booking'}</p>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">
                                        {new Date(b.arrival_datetime).toLocaleDateString()} - <br/>
                                        {new Date(b.departure_datetime).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-800">
                                        {b.bulk_booking_metadata?.expected_guest_count || 0}
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={b.booking_state} />
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => setSelectedBookingId(b.booking_id)} 
                                            className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm"
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" /> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
