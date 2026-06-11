import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, Users, FileText, Calendar, CheckCircle } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import { getFormattedBookingId } from '../../../utils/booking';
import { BULK_BOOKING_STATUS_LABELS } from '../../../utils/constants';
import CreateBulkBookingForm from './CreateBulkBookingForm';
import BulkBookingDetailPanel from './BulkBookingDetailPanel';

export default function BulkBookingsTab({ allRooms, isRoomAvailableForDates }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // View state: 'list', 'create', 'detail'
    const [view, setView] = useState('list');
    const [selectedBooking, setSelectedBooking] = useState(null);

    const loadBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await bulkBookingApi.getBulkBookings(100, 0, statusFilter, searchQuery);
            if (res.success) {
                setBookings(res.data.data || res.data.rows || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load bulk bookings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'list') {
            loadBookings();
        }
    }, [view, statusFilter]);

    // Render List View
    if (view === 'list') {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4 items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Bulk Bookings
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Manage large group reservations and events</p>
                    </div>
                    <button
                        onClick={() => setView('create')}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Bulk Booking
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-white">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search applicant, reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="min-w-[200px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING_APPROVER">Pending Approver</option>
                            <option value="PENDING_ADMIN">Pending Guest House Chair</option>
                            <option value="ADMIN_APPROVED">Confirmed</option>
                            <option value="CHECKED_IN">Checked In</option>
                            <option value="CHECKED_OUT">Completed</option>
                        </select>
                    </div>
                    <button
                        onClick={loadBookings}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Apply
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No bulk bookings found</h3>
                            <p className="text-sm text-slate-500 mt-1">Create a new one or adjust your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {bookings.map(booking => (
                                <div key={booking.booking_id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-bold text-slate-800">
                                                    {getFormattedBookingId(booking)}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide
                                                    ${booking.booking_state === 'ADMIN_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                      booking.booking_state === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                                                      booking.booking_state.includes('REJECTED') ? 'bg-red-100 text-red-700' :
                                                      'bg-orange-100 text-orange-700'}
                                                `}>
                                                    {BULK_BOOKING_STATUS_LABELS[booking.booking_state] || booking.booking_state}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">
                                                {booking.bulk_booking_metadata?.applicant_name || booking.applicant_name || 'N/A'} • {booking.bulk_booking_metadata?.applicant_department || booking.bulk_booking_metadata?.department || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-700">Ref: {booking.bulk_booking_reference}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-400 font-bold uppercase">Dates</span>
                                            <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(booking.arrival_datetime).toLocaleDateString()} - {new Date(booking.departure_datetime).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-400 font-bold uppercase">Event / Scope</span>
                                            <span className="text-sm font-medium text-slate-700 truncate" title={booking.bulk_booking_metadata?.event_name}>
                                                {booking.bulk_booking_metadata?.event_name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <div className="text-xs font-medium text-slate-500">
                                            Expected Guests: <span className="font-bold text-slate-700">{booking.bulk_booking_metadata?.expected_guest_count || 0}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {['DRAFT', 'PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED'].includes(booking.booking_state) && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Are you sure you want to delete this bulk booking? This action cannot be undone.')) {
                                                            try {
                                                                const res = await bulkBookingApi.deleteBulkBooking(booking.booking_id);
                                                                if (res.success) {
                                                                    loadBookings();
                                                                }
                                                            } catch (err) {
                                                                alert(err.message || 'Failed to delete booking');
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 text-sm font-bold rounded-xl transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedBooking(booking);
                                                    setView('detail');
                                                }}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'create') {
        return (
            <CreateBulkBookingForm
                onBack={() => setView('list')}
                onSuccess={(newBooking) => {
                    setView('list');
                    loadBookings();
                }}
            />
        );
    }

    if (view === 'detail' && selectedBooking) {
        return (
            <BulkBookingDetailPanel
                bookingId={selectedBooking.booking_id}
                onBack={() => {
                    setView('list');
                    loadBookings();
                }}
            />
        );
    }

    return null;
}
