import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle,
  FileText,
  ClipboardCheck,
  Plus,
  CreditCard,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import MyBookingsTable from './MyBookingsTable';
import ApprovalQueueTable from './ApprovalQueueTable';
import PaymentsTable from './PaymentsTable';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [approvalBookings, setApprovalBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('my_bookings'); // 'my_bookings' or 'approvals'
  const [previewId, setPreviewId] = useState(null);
  const navigate = useNavigate();

  const userRole = String(user?.role || '').trim().toLowerCase();
  const isSuperAdmin = ['super_admin', 'admin', 'guest_house_admin'].includes(userRole);
  const isApprover =
    isSuperAdmin ||
    ['hod', 'dean', 'registrar'].includes(userRole) ||
    ['admin@nitt.edu', 'hod@nitt.edu'].includes(user?.email);

  useEffect(() => {
    if (!user) {
      return;
    }

    // PERFECT ROUTING: Send Admins straight to Approvals, Regular users to My Bookings

    if (isApprover) setActiveTab('approvals');

    fetchMyBookings();
    fetchApprovalBookings();
  }, [user, isApprover]);

  const fetchMyBookings = async () => {
    try {
      const response = await api.get(`/bookings/my`);
      if (response.success) setMyBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch my bookings:', error);
    }
  };

  const fetchApprovalBookings = async () => {
    try {
      const response = await api.get(`/bookings/admin/all`);
      if (response.success) {
        setApprovalBookings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    let remarks = '';
    if (status === 'REJECTED') {
      remarks = window.prompt('Please enter the reason for rejection:');
      if (remarks === null) return;
    }
    try {
      await api.patch(`/bookings/${id}/admin-status`, { status, remarks });
      fetchApprovalBookings(); // Refresh list
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleMockPay = async (id) => {
    try {
      await api.post(`/bookings/${id}/pay`, {});
      fetchMyBookings(); // Refresh list
      if (isApprover) fetchApprovalBookings();
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending request?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`, {});
      fetchMyBookings(); // Refresh list
      if (isApprover) fetchApprovalBookings(); // Refresh admin list
    } catch (error) {
      alert(error.message || 'Failed to delete booking');
    }
  };

  if (!user) return null;


  const adminPending = approvalBookings.filter(
    (b) => b.booking_state && b.booking_state.startsWith('PENDING_')
  );
  const adminProcessed = approvalBookings.filter(
    (b) => b.booking_state && !b.booking_state.startsWith('PENDING_')
  );
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
            <p className="text-slate-500 font-medium capitalize">
              Welcome, {user.full_name || user.email} ({String(user.role || '').replace(/_/g, ' ')})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/book')}
            className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
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

      {activeTab === 'my_bookings' && (
        <MyBookingsTable
          bookings={myBookings}
          handleMockPay={handleMockPay}
          handleDelete={handleDelete}
        />
      )}

      {(activeTab === 'approvals' || activeTab === 'approved_requests') && (
        <ApprovalQueueTable
          activeTab={activeTab}
          bookings={activeAdminList}
          setPreviewId={setPreviewId}
          handleUpdateStatus={handleUpdateStatus}
          handleMockPay={handleMockPay}
          handleDelete={handleDelete}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsTable bookings={myBookings} handleMockPay={handleMockPay} />
      )}

      {previewId && (
        <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
