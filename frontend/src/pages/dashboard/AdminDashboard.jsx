import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle,
  XCircle,
  FileText,
  ClipboardCheck,
  Plus,
  CreditCard,
  Receipt,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import MyBookingsTable from './MyBookingsTable';
import ApprovalQueueTable from './ApprovalQueueTable';
import PaymentsTable from './PaymentsTable';
import PaymentProofModal from '../../components/ui/PaymentProofModal';
import AdminPaymentVerificationModal from '../../components/ui/AdminPaymentVerificationModal';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [approvalBookings, setApprovalBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals', 'approved_requests', 'rejected_requests', 'payments', 'final_bills'
  const [previewId, setPreviewId] = useState(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [verificationModalBooking, setVerificationModalBooking] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, id: null, action: null });
  const [remarks, setRemarks] = useState('');
  const [sortBy, setSortBy] = useState('app_desc');
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

  const handleUpdateStatus = (id, status) => {
    setActionModal({ isOpen: true, id, action: status });
    setRemarks('');
  };

  const handleConfirmAction = async () => {
    try {
      await api.patch(`/bookings/${actionModal.id}/admin-status`, { 
        status: actionModal.action, 
        remarks 
      });
      setActionModal({ isOpen: false, id: null, action: null });
      setRemarks('');
      fetchApprovalBookings(); // Refresh list
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error.message || 'Failed to update booking status.');
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
    if (!window.confirm('Are you sure you want to withdraw/delete this request?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`, {});
      fetchMyBookings(); // Refresh list
      if (isApprover) fetchApprovalBookings(); // Refresh admin list
    } catch (error) {
      alert(error.message || 'Failed to delete booking');
    }
  };

  const handleWithdrawDecision = async (id) => {
    try {
      await api.patch(`/bookings/${id}/admin-status`, { status: 'WITHDRAW', remarks: 'Decision withdrawn by Guest House Manager' });
      fetchApprovalBookings(); // Refresh list
    } catch (error) {
      alert(error.message || 'Failed to withdraw decision.');
    }
  };

  if (!user) return null;


  const sortedApprovalBookings = [...approvalBookings].sort((a, b) => {
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

  const adminPending = sortedApprovalBookings.filter(
    (b) => b.booking_state === 'PENDING_ADMIN'
  );
  const adminApproved = sortedApprovalBookings.filter(
    (b) => b.booking_state && ['ADMIN_APPROVED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'].includes(b.booking_state)
  );
  const adminRejected = sortedApprovalBookings.filter(
    (b) => b.booking_state && ['ADMIN_REJECTED', 'REJECTED'].includes(b.booking_state)
  );

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
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Sort:</span>
            <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-700 text-sm font-bold outline-none focus:ring-0 py-1"
            >
                <option value="app_desc">App Date (New)</option>
                <option value="app_asc">App Date (Old)</option>
                <option value="arr_asc">Arrival (Soon)</option>
                <option value="arr_desc">Arrival (Late)</option>
            </select>
          </div>
          <button
            onClick={() => navigate('/book')}
            className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> New Application
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" /> Pending
              {adminPending.length > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {adminPending.length > 99 ? '99+' : adminPending.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved_requests')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approved_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approved
              {adminApproved.length > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] bg-emerald-400 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {adminApproved.length > 99 ? '99+' : adminApproved.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rejected_requests')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'rejected_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <XCircle className="w-4 h-4 mr-2" /> Rejected
              {adminRejected.length > 0 && (
                <span className="ml-2 min-w-[18px] h-[18px] bg-red-400 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {adminRejected.length > 99 ? '99+' : adminRejected.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'payments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CreditCard className="w-4 h-4 mr-2" /> Payments
            </button>
            <button
              onClick={() => setActiveTab('final_bills')}
              className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'final_bills' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Receipt className="w-4 h-4 mr-2" /> Final Bills
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'my_bookings' && (
        <MyBookingsTable
          bookings={myBookings}
          handleOpenPayment={setPaymentModalBooking}
          handleDelete={handleDelete}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalQueueTable
          activeTab={activeTab}
          bookings={adminPending}
          setPreviewId={setPreviewId}
          handleUpdateStatus={handleUpdateStatus}
          handleMockPay={handleMockPay}
          handleDelete={handleDelete}
          handleWithdrawDecision={handleWithdrawDecision}
        />
      )}

      {activeTab === 'approved_requests' && (
        <ApprovalQueueTable
          activeTab={activeTab}
          bookings={adminApproved}
          setPreviewId={setPreviewId}
          handleUpdateStatus={handleUpdateStatus}
          handleMockPay={handleMockPay}
          handleDelete={handleDelete}
          handleWithdrawDecision={handleWithdrawDecision}
        />
      )}

      {activeTab === 'rejected_requests' && (
        <ApprovalQueueTable
          activeTab={activeTab}
          bookings={adminRejected}
          setPreviewId={setPreviewId}
          handleUpdateStatus={handleUpdateStatus}
          handleMockPay={handleMockPay}
          handleDelete={handleDelete}
          handleWithdrawDecision={handleWithdrawDecision}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsTable bookings={approvalBookings} handleManage={setVerificationModalBooking} refresh={fetchApprovalBookings} />
      )}

      {activeTab === 'final_bills' && (() => {
        const checkedOut = approvalBookings.filter(b => b.booking_state === 'CHECKED_OUT');
        return checkedOut.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Completed Stays</h3>
            <p className="text-slate-500">Final bills appear here once guests check out.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Booking ID</th>
                  <th className="p-4 font-bold">Applicant</th>
                  <th className="p-4 font-bold">Room(s)</th>
                  <th className="p-4 font-bold">Check-Out</th>
                  <th className="p-4 font-bold">Payment</th>
                  <th className="p-4 font-bold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkedOut.map(b => (
                  <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">{b.booking_id.split('-')[0]}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 text-sm">{b.applicant_name}</p>
                      <p className="text-xs text-slate-500">{b.purpose_of_visit}</p>
                    </td>
                    <td className="p-4 text-sm font-bold text-blue-700">{b.allocated_room_numbers || '—'}</td>
                    <td className="p-4 text-sm text-slate-700">{b.checked_out_at ? new Date(b.checked_out_at).toLocaleDateString() : '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs font-extrabold px-2 py-1 rounded-lg ${
                        b.payment_state === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{b.payment_state}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setPreviewId(b.booking_id)}
                        className="inline-flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {previewId && (
        <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />
      )}

      {paymentModalBooking && (
        <PaymentProofModal booking={paymentModalBooking} onClose={() => setPaymentModalBooking(null)} />
      )}

      {verificationModalBooking && (
        <AdminPaymentVerificationModal 
          booking={verificationModalBooking} 
          onClose={() => setVerificationModalBooking(null)} 
          onSuccess={() => { setVerificationModalBooking(null); fetchApprovalBookings(); fetchMyBookings(); }} 
        />
      )}

      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex items-center mb-6">
              {actionModal.action === 'APPROVED' ? <CheckCircle className="w-6 h-6 text-emerald-500 mr-2" /> : <XCircle className="w-6 h-6 text-red-500 mr-2" />}
              <h3 className="text-xl font-extrabold text-slate-800">
                {actionModal.action === 'APPROVED' ? 'Approve Booking' : 'Reject Booking'}
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-4 font-medium">
              {actionModal.action === 'APPROVED' 
                ? 'Are you sure you want to approve this accommodation request?' 
                : 'Please provide a brief reason for rejecting this request:'}
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={actionModal.action === 'APPROVED' ? 'Optional remarks...' : 'Reason for rejection (required)...'}
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-6 h-28 resize-none shadow-inner"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setActionModal({ isOpen: false, id: null, action: null }); setRemarks(''); }}
                className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionModal.action === 'REJECTED' && !remarks.trim()}
                className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-colors shadow-sm ${actionModal.action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
