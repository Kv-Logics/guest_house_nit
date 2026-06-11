import React, { useState, useEffect } from 'react';
import { X, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { bulkBookingApi } from '../../../services/bulkBookingApi';
import api from '../../../services/api';
import RoomMatrix from '../../dashboard/RoomMatrix';
import { receptionService } from '../../../services/reception.service';

export default function CreateBulkBookingForm({ onBack, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [authorities, setAuthorities] = useState([]);
    const [authoritySearch, setAuthoritySearch] = useState('');
    const [isAuthorityDropdownOpen, setIsAuthorityDropdownOpen] = useState(false);

    // Applicant user search states
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [searchingUsers, setSearchingUsers] = useState(false);

    // Room matrix states
    const [allRooms, setAllRooms] = useState([]);
    const [selectedRoomIds, setSelectedRoomIds] = useState([]);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const translateRoomsFromBackend = (rooms) => {
        return (rooms || []).map(r => {
            let status = 'AVAILABLE';
            if (r.current_status === 'occupied') status = 'OCCUPIED';
            else if (r.current_status === 'double occupied') status = 'DOUBLE_OCCUPIED';
            else if (r.current_status === 'cleaning') status = 'CLEANING';
            else if (r.current_status === 'maintenance') status = 'MAINTENANCE';

            return {
                floor: r.floor_number === 0 ? 'GROUND FLOOR' : 
                       r.floor_number === 1 ? 'FIRST FLOOR' : 
                       r.floor_number === 2 ? 'SECOND FLOOR' : 'THIRD FLOOR',
                roomId: r.room_number,
                room_id: r.room_id,
                roomNumber: r.room_number,
                roomType: r.room_type,
                status: status,
                future_allocations: r.future_allocations || []
            };
        });
    };

    const isRoomAvailableForDates = (room, checkInDate, checkOutDate) => {
        if (!checkInDate || !checkOutDate) return true;
        const start = new Date(checkInDate).getTime();
        const end = new Date(checkOutDate).getTime();

        if (room.future_allocations && room.future_allocations.length > 0) {
            for (const alloc of room.future_allocations) {
                const allocStart = new Date(alloc.allocated_from).getTime();
                const allocEnd = new Date(alloc.allocated_to).getTime();
                if (start < allocEnd && end > allocStart) {
                    return false;
                }
            }
        }
        return true;
    };

    const getMatrixRooms = () => {
        return allRooms.map(r => {
            const isAvail = isRoomAvailableForDates(r, formData.arrivalDate, formData.departureDate);
            return {
                ...r,
                status: isAvail ? 'AVAILABLE' : 'OCCUPIED'
            };
        });
    };

    const handleRoomClick = (roomId) => {
        setSelectedRoomIds(prev => {
            const isSelected = prev.includes(roomId);
            return isSelected 
                ? prev.filter(id => id !== roomId) 
                : [...prev, roomId];
        });
    };

    const [formData, setFormData] = useState({
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        applicantRollNumber: '',
        applicantDesignation: '',
        department: '',
        eventName: '',
        expectedGuestCount: 1,
        arrivalDate: '',
        departureDate: '',
        purposeOfVisit: '',
        categoryId: '2',
        approvingAuthority: '',
        remarks: ''
    });

    const filteredAuthorities = authorities.filter(a => {
        const term = authoritySearch.toLowerCase();
        return (
            a.full_name.toLowerCase().includes(term) ||
            (a.role || '').toLowerCase().includes(term) ||
            (a.email || '').toLowerCase().includes(term) ||
            (a.department || '').toLowerCase().includes(term)
        );
    });

    useEffect(() => {
        if (authorities.length > 0) {
            if (formData.approvingAuthority) {
                const selected = authorities.find(a => a.user_id === formData.approvingAuthority);
                if (selected) {
                    setAuthoritySearch(`${selected.full_name} (${selected.role?.toUpperCase()} - ${selected.department})`);
                } else {
                    setFormData(prev => ({ ...prev, approvingAuthority: '' }));
                    setAuthoritySearch('');
                }
            }
        } else {
            setAuthoritySearch('');
        }
    }, [formData.approvingAuthority, authorities]);

    useEffect(() => {
        const fetchAuthorities = async () => {
            if (!formData.categoryId) return;
            try {
                const res = await api.get(`/bookings/authorities?category_id=${formData.categoryId}`);
                if (res.success) {
                    setAuthorities(res.data || []);
                    // Do not auto-populate the first authority. Leave it blank so they can search/select explicitly.
                    setFormData(prev => ({ ...prev, approvingAuthority: '' }));
                }
            } catch (err) {
                console.error('Failed to load authorities', err);
            }
        };
        fetchAuthorities();
    }, [formData.categoryId]);

    useEffect(() => {
        const fetchRooms = async () => {
            if (!formData.arrivalDate || !formData.departureDate) return;
            try {
                const res = await receptionService.getRooms();
                if (res.success) {
                    setAllRooms(translateRoomsFromBackend(res.data || []));
                }
            } catch (err) {
                console.error("Failed to fetch rooms in CreateBulkBookingForm", err);
            }
        };
        fetchRooms();
    }, [formData.arrivalDate, formData.departureDate]);

    // Handle applicant search
    useEffect(() => {
        const searchUsers = async () => {
            if (userSearchQuery.trim().length < 2) {
                setUserSearchResults([]);
                return;
            }
            try {
                setSearchingUsers(true);
                const res = await api.get(`/bookings/users/search?query=${userSearchQuery}`);
                if (res.success) {
                    setUserSearchResults(res.data || []);
                }
            } catch (err) {
                console.error('Failed to search users', err);
            } finally {
                setSearchingUsers(false);
            }
        };

        const timer = setTimeout(() => {
            searchUsers();
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleEmailBlur = async (e) => {
        const email = e.target.value.trim();
        if (!email || !email.includes('@')) return;
        try {
            const res = await api.get(`/bookings/users/by-email/${encodeURIComponent(email)}`);
            if (res.success && res.data) {
                const u = res.data;
                setFormData(prev => ({
                    ...prev,
                    applicantName: u.full_name,
                    applicantRollNumber: u.employee_id || '',
                    applicantDesignation: u.designation || '',
                    department: u.department || prev.department
                }));
                setUserSearchQuery(`${u.full_name} (${u.email})`);
            }
        } catch (err) {
            console.error('Failed to fetch user by email', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');
            
            const payload = {
                category_id: parseInt(formData.categoryId, 10),
                assigned_approver_id: formData.approvingAuthority || null,
                arrival_datetime: formData.arrivalDate,
                departure_datetime: formData.departureDate,
                purpose_of_visit: formData.purposeOfVisit,
                rooms_required: selectedRoomIds.length || 1,
                allocated_room_numbers: selectedRoomIds.join(','),
                bulk_booking_metadata: {
                    applicant_name: formData.applicantName,
                    applicant_email: formData.applicantEmail,
                    applicant_phone: formData.applicantPhone,
                    applicant_roll_number: formData.applicantRollNumber,
                    applicant_designation: formData.applicantDesignation,
                    department: formData.department,
                    event_name: formData.eventName,
                    expected_guest_count: parseInt(formData.expectedGuestCount, 10),
                    remarks: formData.remarks
                }
            };
            
            const res = await bulkBookingApi.createBulkBooking(payload);
            if (res.success) {
                if (onSuccess) onSuccess(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create bulk booking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                <button
                    onClick={onBack}
                    className="p-2 bg-white text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-200 shadow-sm transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">New Bulk Booking</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Create a draft for a large event or conference</p>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 mb-6">
                        {error}
                    </div>
                )}
                
                <form id="createBulkBookingForm" onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Event Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Event / Conference Name *</label>
                                <input
                                    type="text"
                                    name="eventName"
                                    required
                                    value={formData.eventName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Expected Guest Count *</label>
                                <input
                                    type="number"
                                    name="expectedGuestCount"
                                    required
                                    min="1"
                                    value={formData.expectedGuestCount}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Arrival Date *</label>
                                <input
                                    type="date"
                                    name="arrivalDate"
                                    required
                                    min={todayStr}
                                    value={formData.arrivalDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Departure Date *</label>
                                <input
                                    type="date"
                                    name="departureDate"
                                    required
                                    min={formData.arrivalDate || todayStr}
                                    value={formData.departureDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Purpose of Visit *</label>
                                <input
                                    type="text"
                                    name="purposeOfVisit"
                                    required
                                    value={formData.purposeOfVisit}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            {formData.arrivalDate && formData.departureDate && (
                                <div className="col-span-full mt-4 border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Rooms to Block ({selectedRoomIds.length} Selected)</label>
                                    <RoomMatrix 
                                        rooms={getMatrixRooms()} 
                                        activeRoomIds={selectedRoomIds} 
                                        onRoomClick={handleRoomClick} 
                                        now={new Date(formData.arrivalDate)}
                                        title="Available Rooms to Block"
                                        showCategories={true}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Applicant Information</h3>
                        
                        {/* Search and Populate bar */}
                        <div className="relative mb-6 pb-4 border-b border-slate-100">
                            <label className="block text-sm font-bold text-indigo-700 mb-1">Search & Populate Applicant (NITT Name, Email or ID) *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type name, email or employee ID to search..."
                                    value={userSearchQuery}
                                    onFocus={() => setIsUserDropdownOpen(true)}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setIsUserDropdownOpen(false);
                                        }, 250);
                                    }}
                                    onChange={(e) => {
                                        setUserSearchQuery(e.target.value);
                                        setIsUserDropdownOpen(true);
                                    }}
                                    className="w-full px-4 py-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-indigo-300 font-medium"
                                />
                                {searchingUsers && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    </div>
                                )}
                            </div>
                            {isUserDropdownOpen && userSearchQuery.trim().length >= 2 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {userSearchResults.length === 0 ? (
                                        <div className="px-4 py-2 text-sm text-slate-400">No matching users found</div>
                                    ) : (
                                        userSearchResults.map(u => (
                                            <div
                                                key={u.user_id}
                                                onMouseDown={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        applicantName: u.full_name,
                                                        applicantEmail: u.email,
                                                        applicantRollNumber: u.employee_id || '',
                                                        applicantDesignation: u.designation || '',
                                                        department: u.department || ''
                                                    }));
                                                    setUserSearchQuery(`${u.full_name} (${u.email})`);
                                                    setIsUserDropdownOpen(false);
                                                }}
                                                className="px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <div className="font-bold text-slate-800">{u.full_name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{u.email} • {u.designation || 'N/A'} • {u.department || 'N/A'}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Applicant Name *</label>
                                <input
                                    type="text"
                                    name="applicantName"
                                    required
                                    value={formData.applicantName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Roll Number / Employee ID *</label>
                                <input
                                    type="text"
                                    name="applicantRollNumber"
                                    required
                                    value={formData.applicantRollNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Department *</label>
                                <input
                                    type="text"
                                    name="department"
                                    required
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    name="applicantEmail"
                                    required
                                    value={formData.applicantEmail}
                                    onChange={handleChange}
                                    onBlur={handleEmailBlur}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    name="applicantPhone"
                                    required
                                    value={formData.applicantPhone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Booking Category & Approver */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Category & Approvals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Category *</label>
                                <select
                                    name="categoryId"
                                    required
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="1">Category I (Institute Guests)</option>
                                    <option value="2">Category II (Projects/Events)</option>
                                    <option value="3">Category III (Personal/Alumni)</option>
                                </select>
                            </div>
                             <div className="relative">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Approving Authority *</label>
                                <input
                                    type="text"
                                    placeholder="Search by name, role, or department..."
                                    value={authoritySearch}
                                    onFocus={() => setIsAuthorityDropdownOpen(true)}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setIsAuthorityDropdownOpen(false);
                                            const selected = authorities.find(a => a.user_id === formData.approvingAuthority);
                                            if (selected) {
                                                setAuthoritySearch(`${selected.full_name} (${selected.role?.toUpperCase()} - ${selected.department})`);
                                            } else {
                                                setAuthoritySearch('');
                                            }
                                        }, 250);
                                    }}
                                    onChange={(e) => {
                                        setAuthoritySearch(e.target.value);
                                        setIsAuthorityDropdownOpen(true);
                                    }}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {isAuthorityDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                        {filteredAuthorities.length === 0 ? (
                                            <div className="px-4 py-2 text-sm text-slate-400">No authorities found</div>
                                        ) : (
                                            filteredAuthorities.map(a => (
                                                <div
                                                    key={a.user_id}
                                                    onMouseDown={() => {
                                                        setFormData(prev => ({ ...prev, approvingAuthority: a.user_id }));
                                                        setAuthoritySearch(`${a.full_name} (${a.role?.toUpperCase()} - ${a.department})`);
                                                        setIsAuthorityDropdownOpen(false);
                                                    }}
                                                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="font-bold text-slate-700 text-xs">{a.full_name} ({a.role?.toUpperCase()} - {a.department})</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">{a.email}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Additional Remarks (Optional)</label>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="createBulkBookingForm"
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Draft
                </button>
            </div>
        </div>
    );
}
