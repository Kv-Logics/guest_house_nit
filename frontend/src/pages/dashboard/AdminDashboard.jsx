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
  Filter,
  Database,
  Calendar
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BookingDetailsModal from '../../components/ui/BookingDetailsModal';
import PaymentProofModal from '../../components/ui/PaymentProofModal';
import MyBookingsTable from './MyBookingsTable';
import ApprovalQueueTable from './ApprovalQueueTable';
import SystemLogs from './SystemLogs';
import RoomMatrixTab from '../../components/reception/RoomMatrixTab';
import OccupancyStats from '../../components/admin/OccupancyStats';
import { getFormattedBookingId } from '../../utils/booking';
import { receptionService } from '../../services/reception.service';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [adminPending, setAdminPending] = useState([]);
  const [adminApproved, setAdminApproved] = useState([]);
  const [adminRejected, setAdminRejected] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals', 'approved_requests', 'rejected_requests', 'room_matrix'
  const [previewId, setPreviewId] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, id: null, action: null });
  const [remarks, setRemarks] = useState('');
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  
  // Search & Pagination State
  const [searchTermInput, setSearchTermInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [offsets, setOffsets] = useState({ approvals: 0, approved_requests: 0, rejected_requests: 0 });
  const [hasMore, setHasMore] = useState({ approvals: true, approved_requests: true, rejected_requests: true });
  const [loading, setLoading] = useState(false);
  const [monthFilter, setMonthFilter] = useState('current'); // 'current' | 'archive'
  const [sortBy, setSortBy] = useState('arr_asc'); // 'arr_asc', 'arr_desc', 'app_asc', 'app_desc'

  const navigate = useNavigate();

  const userRole = String(user?.role || '').trim().toLowerCase();
  const isSuperAdmin = ['super_admin', 'admin', 'guest_house_admin'].includes(userRole);
  const isApprover =
    isSuperAdmin ||
    ['hod', 'dean', 'registrar'].includes(userRole) ||
    ['admin@nitt.edu', 'hod@nitt.edu'].includes(user?.email);

  useEffect(() => {
    if (!user) return;
    if (isApprover && activeTab === 'approvals' && adminPending.length === 0) setActiveTab('approvals');
    fetchMyBookings();
  }, [user]);

  useEffect(() => {
      if (!isApprover) return;
      if (activeTab === 'room_matrix') {
          fetchRooms();
          return;
      }
      // When tab or search changes, reset offset and load fresh
      setOffsets(prev => ({ ...prev, [activeTab]: 0 }));
      loadTabBookings(activeTab, 0, false, activeSearchTerm);
  }, [activeTab, activeSearchTerm, isApprover, monthFilter, sortBy]);

  const fetchRooms = async () => {
      try {
          setLoading(true);
          const res = await receptionService.getRooms();
          if (res.success) {
              setRooms(res.data || []);
          }
      } catch (error) {
          console.error('Failed to fetch rooms:', error);
      } finally {
          setLoading(false);
      }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await api.get(`/bookings/my`);
      if (response.success) setMyBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch my bookings:', error);
    }
  };

  const getStatusFilterForTab = (tab) => {
      switch(tab) {
          case 'approvals': return 'PENDING_ADMIN';
          case 'approved_requests': return 'ADMIN_APPROVED';
          case 'rejected_requests': return 'ADMIN_REJECTED';
          default: return '';
      }
  };

  const loadTabBookings = async (tab, offset = 0, isAppend = false, search = '') => {
    try {
      setLoading(true);
      const limit = offset === 0 ? 50 : 100;
      const statusFilter = getStatusFilterForTab(tab);
      const response = await api.get(`/bookings/admin/all`, {
          params: { limit, offset, status: statusFilter, search, month_filter: monthFilter, sortBy }
      });
      
      if (response.success) {
        const newItems = response.data.rows;
        const totalCount = response.data.totalCount;
        
        const updateState = (setter) => {
            if (isAppend) setter(prev => [...prev, ...newItems]);
            else setter(newItems);
        };

        if (tab === 'approvals') updateState(setAdminPending);
        else if (tab === 'approved_requests') updateState(setAdminApproved);
        else if (tab === 'rejected_requests') updateState(setAdminRejected);

        setHasMore(prev => ({ ...prev, [tab]: newItems.length === limit }));
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
      e.preventDefault();
      setActiveSearchTerm(searchTermInput);
  };

  const handleLoadMore = () => {
      const nextOffset = offsets[activeTab] + (offsets[activeTab] === 0 ? 50 : 100);
      setOffsets(prev => ({ ...prev, [activeTab]: nextOffset }));
      loadTabBookings(activeTab, nextOffset, true, activeSearchTerm);
  };

  const [financialYear, setFinancialYear] = useState('25-26');

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
      loadTabBookings(activeTab, 0, false, activeSearchTerm); // Refresh current list
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error.message || 'Failed to update booking status.');
    }
  };

  const handleMockPay = async (id) => {
    try {
      await api.post(`/bookings/${id}/pay`, {});
      fetchMyBookings();
      if (isApprover) loadTabBookings(activeTab, 0, false, activeSearchTerm);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw/delete this request?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`, {});
      fetchMyBookings();
      if (isApprover) loadTabBookings(activeTab, 0, false, activeSearchTerm);
    } catch (error) {
      alert(error.message || 'Failed to delete booking');
    }
  };

  const handleWithdrawDecision = async (id) => {
    try {
      await api.patch(`/bookings/${id}/admin-status`, { status: 'WITHDRAW', remarks: 'Decision withdrawn by GH Chairperson' });
      loadTabBookings(activeTab, 0, false, activeSearchTerm);
    } catch (error) {
      alert(error.message || 'Failed to withdraw decision.');
    }
  };

  if (!user) return null;

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
          {isApprover && (
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                      type="text" 
                      placeholder="Search bookings..." 
                      className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
                      value={searchTermInput}
                      onChange={(e) => setSearchTermInput(e.target.value)}
                  />
                  <button type="submit" className="hidden">Search</button>
              </form>
          )}
          {isApprover && (
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
          )}
          {isApprover && (
              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                  <option value="arr_asc">Arrival (Earliest)</option>
                  <option value="arr_desc">Arrival (Latest)</option>
                  <option value="app_desc">Applied (Newest)</option>
                  <option value="app_asc">Applied (Oldest)</option>
                  <option value="book_desc">Booking ID (Newest)</option>
                  <option value="book_asc">Booking ID (Oldest)</option>
                  <option value="cat_asc">Category (A-Z)</option>
                  <option value="cat_desc">Category (Z-A)</option>
              </select>
          )}
          <button
            onClick={() => navigate('/book')}
            className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> New Application
          </button>
          {isApprover && (
            <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approvals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" /> Pending
              </button>
              <button
                onClick={() => setActiveTab('approved_requests')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approved_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Approved
              </button>
              <button
                onClick={() => setActiveTab('rejected_requests')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'rejected_requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <XCircle className="w-4 h-4 mr-2" /> Rejected
              </button>
              <button
                onClick={() => setActiveTab('room_matrix')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'room_matrix' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Calendar className="w-4 h-4 mr-2" /> Room Matrix
              </button>
              <button
                onClick={() => setActiveTab('occupancy')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'occupancy' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText className="w-4 h-4 mr-2" /> Occupancy
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('master_logs')}
                  className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'master_logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Database className="w-4 h-4 mr-2" /> Master Logs
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'room_matrix' && (
          <RoomMatrixTab 
              allRooms={rooms} 
              isRoomAvailableForDates={(room, checkInDate, checkOutDate) => {
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
              }} 
          />
      )}

      {activeTab === 'my_bookings' && (
        <MyBookingsTable
          bookings={myBookings}
          handleOpenPayment={setPaymentModalBooking}
          handleDelete={handleDelete}
        />
      )}

      {activeTab === 'approvals' && (
        <>
          <ApprovalQueueTable
            activeTab={activeTab}
            bookings={adminPending}
            setPreviewId={setPreviewId}
            handleUpdateStatus={handleUpdateStatus}
            handleMockPay={handleMockPay}
            handleDelete={handleDelete}
            handleWithdrawDecision={handleWithdrawDecision}
          />
          {hasMore.approvals && adminPending.length > 0 && !loading && (
            <div className="p-4 text-center mt-4">
                <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    Load More Records
                </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'approved_requests' && (
        <>
          <ApprovalQueueTable
            activeTab={activeTab}
            bookings={adminApproved}
            setPreviewId={setPreviewId}
            handleUpdateStatus={handleUpdateStatus}
            handleMockPay={handleMockPay}
            handleDelete={handleDelete}
            handleWithdrawDecision={handleWithdrawDecision}
          />
          {hasMore.approved_requests && adminApproved.length > 0 && !loading && (
            <div className="p-4 text-center mt-4">
                <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    Load More Records
                </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'rejected_requests' && (
        <>
          <ApprovalQueueTable
            activeTab={activeTab}
            bookings={adminRejected}
            setPreviewId={setPreviewId}
            handleUpdateStatus={handleUpdateStatus}
            handleMockPay={handleMockPay}
            handleDelete={handleDelete}
            handleWithdrawDecision={handleWithdrawDecision}
          />
          {hasMore.rejected_requests && adminRejected.length > 0 && !loading && (
            <div className="p-4 text-center mt-4">
                <button onClick={handleLoadMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    Load More Records
                </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'master_logs' && isSuperAdmin && (
          <SystemLogs />
      )}

      {activeTab === 'occupancy' && (
          <OccupancyStats />
      )}

      {previewId && (
        <BookingDetailsModal bookingId={previewId} onClose={() => setPreviewId(null)} />
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
                ? 'Optional remarks for this approval:' 
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
      {paymentModalBooking && (
        <PaymentProofModal booking={paymentModalBooking} onClose={() => setPaymentModalBooking(null)} />
      )}
    </div>
  );
}
