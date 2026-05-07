import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, XCircle, FileText, ClipboardCheck, ChevronDown, ChevronUp, Plus, Users, Utensils, Trash2, CreditCard } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [approvalBookings, setApprovalBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('my_bookings'); // 'my_bookings' or 'approvals'
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [showFood, setShowFood] = useState({});
  const navigate = useNavigate();

  const toggleFood = (bookingId) => {
    setShowFood(prev => ({ ...prev, [bookingId]: !prev[bookingId] }));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    // PERFECT ROUTING: Send Admins straight to Approvals, Regular users to My Bookings
    const role = String(parsedUser.role || '').trim().toLowerCase();
    const isAuthority = ['super_admin', 'admin', 'guest_house_admin', 'hod', 'dean', 'registrar'].includes(role) || ['admin@nitt.edu', 'hod@nitt.edu'].includes(parsedUser.email);
    
    if (isAuthority) setActiveTab('approvals');

    fetchMyBookings(token);
    fetchApprovalBookings(token);
  }, [navigate]);

  const fetchMyBookings = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setMyBookings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch my bookings:', error);
    }
  };

  const fetchApprovalBookings = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setApprovalBookings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleUpdateStatus = async (id, status, stage) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/admin/bookings/${id}/status`, { status, stage }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchApprovalBookings(token); // Refresh list
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleMockPay = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/bookings/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyBookings(token); // Refresh list
      if (isApprover) fetchApprovalBookings(token);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending request?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyBookings(token); // Refresh list
      if (isApprover) fetchApprovalBookings(token); // Refresh admin list
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete booking');
    }
  };

  if (!user) return null;

  const userRole = String(user.role || '').trim().toLowerCase();
  const isSuperAdmin = ['super_admin', 'admin', 'guest_house_admin'].includes(userRole);
  const isApprover = 
    isSuperAdmin || ['hod', 'dean', 'registrar'].includes(userRole) || 
    ['admin@nitt.edu', 'hod@nitt.edu'].includes(user.email);

  const adminPending = approvalBookings.filter(b => b.booking_state === 'PENDING_APPROVAL');
  const adminProcessed = approvalBookings.filter(b => b.booking_state !== 'PENDING_APPROVAL');
  const activeAdminList = activeTab === 'approvals' ? adminPending : adminProcessed;

  return (
    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard</h2>
            <p className="text-slate-500 font-medium capitalize">Welcome, {user.full_name || user.email} ({String(user.role || '').replace(/_/g, ' ')})</p>
          </div>
        </div>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/book')} className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> New Application
        </button>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {!isSuperAdmin && (
            <button 
              onClick={() => setActiveTab('my_bookings')} 
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'my_bookings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4 mr-2" /> My Bookings
            </button>
          )}
          {isApprover && (
            <>
              <button 
                onClick={() => setActiveTab('approvals')} 
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" /> Pending Approvals
              </button>
              <button 
                onClick={() => setActiveTab('approved_requests')} 
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approved_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Approved
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('payments')} 
            className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'payments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CreditCard className="w-4 h-4 mr-2" /> Payments
          </button>
        </div>
      </div>
    </div>

    {activeTab === 'my_bookings' && myBookings.length === 0 && (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Bookings Found</h3>
        <p className="text-slate-500 max-w-md mx-auto">You have not submitted any accommodation requests yet.</p>
      </div>
    )}

    {activeTab === 'my_bookings' && myBookings.length > 0 && (
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold">Booking ID</th>
                <th className="p-4 font-bold">Arrival</th>
                <th className="p-4 font-bold">Departure</th>
                <th className="p-4 font-bold">Rooms</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myBookings.map((booking) => (
                <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-500">{booking.booking_id}</td>
                  <td className="p-4 text-sm font-medium text-slate-800">{new Date(booking.arrival_datetime).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-slate-800">{new Date(booking.departure_datetime).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-slate-800">{booking.rooms_required}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      booking.booking_state === 'APPROVED' || booking.booking_state === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      booking.booking_state === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {booking.booking_state === 'PENDING_APPROVAL' ? 'Pending Approval' : booking.booking_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {booking.booking_state === 'APPROVED' && (
                      <button onClick={() => handleMockPay(booking.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                        Pay Now
                      </button>
                    )}
                  {booking.booking_state === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleDelete(booking.booking_id)} className="inline-flex items-center p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm ml-2" title="Delete Request">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                    {booking.payment_state === 'PAID' && (
                      <button onClick={() => alert('Mock Receipt Generated & Downloaded!')} className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors">
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    )}

    {(activeTab === 'approvals' || activeTab === 'approved_requests') && activeAdminList.length === 0 && (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <LayoutDashboard className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Bookings Found</h3>
        <p className="text-slate-500 max-w-md mx-auto">There are currently no {activeTab === 'approvals' ? 'pending' : 'approved'} accommodation requests.</p>
      </div>
    )}

    {(activeTab === 'approvals' || activeTab === 'approved_requests') && activeAdminList.length > 0 && (
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold">Applicant</th>
                <th className="p-4 font-bold">Arrival</th>
                <th className="p-4 font-bold">Rooms</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeAdminList.map((booking) => (
              <React.Fragment key={booking.booking_id}>
              <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{booking.applicant_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{booking.department} | {booking.applicant_role.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-800">{new Date(booking.arrival_datetime).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-800">{booking.rooms_required}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      booking.booking_state === 'APPROVED' || booking.booking_state === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      booking.booking_state === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {booking.booking_state === 'PENDING_APPROVAL' ? 'Pending Approval' : booking.booking_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => setExpandedBooking(expandedBooking === booking.booking_id ? null : booking.booking_id)} className="inline-flex items-center p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm" title="View Application Details">
                    {expandedBooking === booking.booking_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                        {booking.booking_state === 'PENDING_APPROVAL' && (
                      <>
                        <button onClick={() => handleUpdateStatus(booking.booking_id, 'APPROVED', 'APPROVED')} className="inline-flex items-center p-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors border border-green-200 shadow-sm" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleUpdateStatus(booking.booking_id, 'REJECTED', 'REJECTED')} className="inline-flex items-center p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm" title="Reject">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                        )}
                        {booking.booking_state === 'APPROVED' && (
                      <button onClick={() => handleMockPay(booking.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                        Pay Now
                      </button>
                        )}
                        {booking.payment_state === 'PAID' && (
                      <button onClick={() => alert('Mock Receipt Generated & Downloaded!')} className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors">
                        Receipt
                      </button>
                    )}
                        <button onClick={() => handleDelete(booking.booking_id)} className="inline-flex items-center p-2 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors border border-slate-200 shadow-sm ml-2" title="Delete Request Completely">
                          <Trash2 className="w-5 h-5" />
                        </button>
                  </td>
                </tr>
              {expandedBooking === booking.booking_id && (
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <td colSpan="5" className="p-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                      
                      {/* Application & Stay Details */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-slate-400" />
                          Application Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Applicant</p>
                            <p className="text-slate-800 font-semibold">{booking.applicant_name}</p>
                            <p className="text-xs text-slate-500">{booking.applicant_email}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Category & Visit</p>
                            <p className="text-slate-800 font-semibold">{booking.category_code || `CAT-${booking.category_id}`} - <span className="capitalize">{booking.visit_type}</span></p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Purpose</p>
                            <p className="text-slate-800 font-semibold">{booking.purpose_of_visit}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Duration</p>
                            <p className="text-slate-800 font-semibold">{new Date(booking.arrival_datetime).toLocaleDateString()} to {new Date(booking.departure_datetime).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Payment</p>
                            <p className="text-slate-800 font-semibold capitalize">{booking.payment_responsible}</p>
                          </div>
                          {booking.project_code && (
                            <div>
                              <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Project Code</p>
                              <p className="text-slate-800 font-semibold">{booking.project_code}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Rooms</p>
                            <p className="text-slate-800 font-semibold">{booking.rooms_required} x {booking.room_type || 'Standard Room'}</p>
                            {booking.extra_beds > 0 && <p className="text-xs text-slate-500">+{booking.extra_beds} Extra Bed(s)</p>}
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium mb-1 text-xs uppercase tracking-wider">Est. Amount</p>
                            <p className="text-emerald-700 font-bold">₹{booking.total_estimated_amount || 0}</p>
                          </div>
                        </div>
                      </div>

                      {/* Guest Details */}
                      <div>
                        <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            Guest Information
                          </h4>
                          <button 
                            onClick={() => toggleFood(booking.booking_id)} 
                            className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-bold border border-orange-200 transition-colors flex items-center shadow-sm">
                            <Utensils className="w-3 h-3 mr-1.5" />
                            {showFood[booking.booking_id] ? 'Hide Food' : 'View Food'}
                          </button>
                        </div>
                        {booking.guests && booking.guests.filter(Boolean).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {booking.guests.filter(Boolean).map((guest, idx) => (
                              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm transition-all">
                                <p className="font-bold text-slate-800">{guest.guest_name}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{guest.relation_to_applicant || 'Guest'}</p>
                                <div className="mt-2 space-y-1 text-slate-600">
                                  {guest.phone && <p>📞 {guest.phone}</p>}
                                  {guest.email && <p>✉️ {guest.email}</p>}
                                  {(guest.gender || guest.age) && <p>👤 {[guest.gender, guest.age ? `${guest.age} yrs` : null].filter(Boolean).join(', ')}</p>}
                                </div>

                                {/* Food Details Dropdown */}
                                {showFood[booking.booking_id] && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 animate-fade-in">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center">
                                      <Utensils className="w-3 h-3 mr-1" /> Meal Requests
                                    </p>
                                    {guest.food_preferences && guest.food_preferences.filter(Boolean).length > 0 ? (
                                      <div className="space-y-1">
                                        {guest.food_preferences.filter(Boolean).map((meal, mIdx) => (
                                           <div key={mIdx} className="text-xs bg-white p-2 rounded-lg border border-slate-100 grid grid-cols-4 gap-1 text-center shadow-sm">
                                             <span className="font-semibold text-slate-700 text-left">{new Date(meal.meal_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                             <span className="text-slate-600 font-medium" title="Breakfast">B: <span className={meal.breakfast > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.breakfast > 0 ? '✓' : '—'}</span></span>
                                             <span className="text-slate-600 font-medium" title="Lunch">L: <span className={meal.lunch > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.lunch > 0 ? '✓' : '—'}</span></span>
                                             <span className="text-slate-600 font-medium" title="Dinner">D: <span className={meal.dinner > 0 ? 'text-green-600 font-extrabold text-sm' : 'text-slate-300'}>{meal.dinner > 0 ? '✓' : '—'}</span></span>
                                           </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No food requested.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No external guests listed.</p>
                        )}
                      </div>

                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

    {activeTab === 'payments' && (
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Pending Payments</h3>
          <p className="text-sm text-slate-500">Bookings that have been approved and require payment.</p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="p-4 font-bold">Booking ID</th>
              <th className="p-4 font-bold">Amount</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myBookings.filter(b => b.booking_state === 'APPROVED' || b.payment_state === 'PAID').length === 0 ? (
               <tr>
                 <td colSpan="4" className="p-8 text-center text-slate-500 italic">No pending payments found.</td>
               </tr>
            ) : (
              myBookings.filter(b => b.booking_state === 'APPROVED' || b.payment_state === 'PAID').map((booking) => (
                <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-500">{booking.booking_id}</td>
                  <td className="p-4 font-bold text-emerald-700">₹{booking.total_estimated_amount || 0}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      booking.payment_state === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {booking.payment_state}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {booking.payment_state === 'PENDING' && booking.booking_state === 'APPROVED' && (
                      <button onClick={() => handleMockPay(booking.booking_id)} className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors">
                        Pay Now
                      </button>
                    )}
                    {booking.payment_state === 'PAID' && (
                      <button onClick={() => alert('Mock Receipt Generated!')} className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors">
                        Download Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )}
    </div>
  );
}