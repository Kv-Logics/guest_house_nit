import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, XCircle, FileText, ClipboardCheck, Plus, Trash2, CreditCard, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BookingDetailsModal from '../components/ui/BookingDetailsModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [approvalBookings, setApprovalBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('my_bookings'); // 'my_bookings' or 'approvals'
  const [previewId, setPreviewId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token || !user) {
      return;
    }

    
    // PERFECT ROUTING: Send Admins straight to Approvals, Regular users to My Bookings
    const role = String(user.role || '').trim().toLowerCase();
    const isAuthority = ['super_admin', 'admin', 'guest_house_admin', 'hod', 'dean', 'registrar'].includes(role) || ['admin@nitt.edu', 'hod@nitt.edu'].includes(user.email);
    
    if (isAuthority) setActiveTab('approvals');

    fetchMyBookings(token);
    fetchApprovalBookings(token);
  }, [user]);

  const fetchMyBookings = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setMyBookings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch my bookings:', error);
    }
  };

  const fetchApprovalBookings = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings/admin/all`, {
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
      await axios.patch(`${API_BASE_URL}/bookings/${id}/admin-status`, { status }, {
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
      await axios.patch(`${API_BASE_URL}/bookings/${id}/cancel`, {}, {
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

  const adminPending = approvalBookings.filter(b => b.booking_state && b.booking_state.startsWith('PENDING_'));
  const adminProcessed = approvalBookings.filter(b => b.booking_state && !b.booking_state.startsWith('PENDING_'));
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
                      {booking.booking_state.startsWith('PENDING_') ? 'Pending Approval' : booking.booking_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {booking.booking_state === 'APPROVED' && (
                      <button onClick={() => handleMockPay(booking.booking_id)} className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">
                        Pay Now
                      </button>
                    )}
                  {booking.booking_state.startsWith('PENDING_') && (
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
                    <p className="text-xs text-slate-500 capitalize">{booking.department}{booking.applicant_role ? ` | ${String(booking.applicant_role).replace(/_/g, ' ')}` : ''}</p>
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
                      {booking.booking_state.startsWith('PENDING_') ? 'Pending Approval' : booking.booking_state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => setPreviewId(booking.booking_id)} className="inline-flex items-center p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm" title="Preview Application">
                    <Eye className="w-5 h-5" />
                  </button>
                        {booking.booking_state.startsWith('PENDING_') && (
                      <>
                        <button onClick={() => handleUpdateStatus(booking.booking_id, 'APPROVED')} className="inline-flex items-center p-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors border border-green-200 shadow-sm" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleUpdateStatus(booking.booking_id, 'REJECTED')} className="inline-flex items-center p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm" title="Reject">
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

    {previewId && <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}