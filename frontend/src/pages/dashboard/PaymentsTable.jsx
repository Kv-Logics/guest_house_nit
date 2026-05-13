import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Eye, CreditCard, CheckCircle, Clock, Send } from 'lucide-react';
import { paymentService } from '../../services/payment.service';

export default function PaymentsTable({ bookings, handleManage, refresh }) {
  const paymentBookings = bookings.filter(
    (b) => b.total_estimated_amount > 0 && b.payment_responsible !== 'institute' && !['DRAFT', 'CANCELLED', 'ADMIN_REJECTED', 'APPROVER_REJECTED'].includes(b.booking_state)
  );

  const [selectedIds, setSelectedIds] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [currentTab, setCurrentTab] = useState('PENDING'); // 'PENDING', 'REVIEW', 'PAID'
  const [bulkAlertModal, setBulkAlertModal] = useState({ isOpen: false, message: 'Please settle your pending guest house dues immediately.' });

  const paidBookings = paymentBookings.filter(b => b.payment_state === 'PAID');
  const reviewBookings = paymentBookings.filter(b => ['PAYMENT_PROOF_SUBMITTED', 'PAYMENT_PROOF_RESUBMITTED', 'UNDER_REVIEW'].includes(b.payment_state));
  const pendingBookings = paymentBookings.filter(b => !paidBookings.includes(b) && !reviewBookings.includes(b));

  const displayedBookings = currentTab === 'PENDING' ? pendingBookings : currentTab === 'REVIEW' ? reviewBookings : paidBookings;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(pendingBookings.map(b => b.booking_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const openBulkAlertModal = () => {
    if (selectedIds.length === 0) return;
    setBulkAlertModal({ isOpen: true, message: 'Please settle your pending guest house dues immediately.' });
  };

  const submitBulkAlert = async () => {
    if (selectedIds.length === 0) return;
    const message = bulkAlertModal.message;
    if (!message.trim()) return;
    
    setIsSending(true);
    setBulkAlertModal({ ...bulkAlertModal, isOpen: false });
    try {
      await Promise.all(selectedIds.map(id => {
        const booking = pendingBookings.find(b => b.booking_id === id);
        let nextLevel = 1;
        if (booking.payment_state === 'WARNING_1_SENT') nextLevel = 2;
        else if (booking.payment_state === 'WARNING_2_SENT') nextLevel = 3;
        else if (booking.payment_state === 'WARNING_3_SENT') nextLevel = 3;

        const nth = nextLevel === 1 ? '1st' : nextLevel === 2 ? '2nd' : '3rd';
        const finalMessage = `${message.trim()} This is your ${nth} warning.`;
        return paymentService.sendWarning(id, nextLevel, finalMessage);
      }));
      alert('Alerts sent successfully!');
      setSelectedIds([]);
      if (refresh) refresh();
    } catch (error) {
      console.error(error);
      alert('Some alerts failed to send. Please check the logs or try again.');
    } finally {
      setIsSending(false);
    }
  };

  const calculateDaysPending = (arrivalDate) => {
    const arr = new Date(arrivalDate);
    arr.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = now - arr;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
        <div className="flex justify-between items-start sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Payments Console</h3>
            <p className="text-sm text-slate-500">
              Track and verify guest payments, POS completions, and proofs.
            </p>
          </div>
          {currentTab === 'PENDING' && selectedIds.length > 0 && (
            <button
              onClick={openBulkAlertModal}
              disabled={isSending}
              className="flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" /> {isSending ? 'Sending...' : `Send Alert (${selectedIds.length})`}
            </button>
          )}
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
            <button onClick={() => {setCurrentTab('PENDING'); setSelectedIds([])}} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'PENDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pending ({pendingBookings.length})</button>
            <button onClick={() => {setCurrentTab('REVIEW'); setSelectedIds([])}} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'REVIEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Under Review ({reviewBookings.length})</button>
            <button onClick={() => {setCurrentTab('PAID'); setSelectedIds([])}} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'PAID' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Paid ({paidBookings.length})</button>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            {currentTab === 'PENDING' && (
              <th className="p-4 w-10">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={selectedIds.length > 0 && selectedIds.length === pendingBookings.length} 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
              </th>
            )}
            <th className="p-4 font-bold">Booking ID</th>
            <th className="p-4 font-bold">Applicant & Category</th>
            <th className="p-4 font-bold">Amount</th>
            <th className="p-4 font-bold">Days Pending</th>
            <th className="p-4 font-bold">Status</th>
            <th className="p-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayedBookings.length === 0 ? (
            <tr>
              <td colSpan={currentTab === 'PENDING' ? 7 : 6} className="p-8 text-center text-slate-500 italic">
                No {currentTab === 'PENDING' ? 'pending' : currentTab === 'REVIEW' ? 'under review' : 'paid'} payments found.
              </td>
            </tr>
          ) : (
            displayedBookings.map((booking) => (
              <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                {currentTab === 'PENDING' && (
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(booking.booking_id)} 
                      onChange={(e) => handleSelectOne(e, booking.booking_id)} 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    />
                  </td>
                )}
                <td className="p-4 font-mono text-xs text-slate-500">{booking.booking_id}</td>
                <td className="p-4">
                  <p className="font-bold text-slate-800">{booking.applicant_name}</p>
                  <p className="text-xs text-slate-500">{booking.category_code}</p>
                </td>
                <td className="p-4 font-bold text-emerald-700">
                  ₹{booking.total_estimated_amount || 0}
                </td>
                <td className="p-4">
                  {booking.payment_state === 'PAID' ? '-' : (
                    <span className={`font-bold ${calculateDaysPending(booking.arrival_datetime) > 7 ? 'text-red-600' : 'text-slate-600'}`}>
                      {calculateDaysPending(booking.arrival_datetime)} Days
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        booking.payment_state === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 
                        booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' : 
                        booking.payment_state.includes('WARNING') || booking.payment_state === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                        'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {booking.payment_state === 'PAID' && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                    {booking.payment_state.includes('WARNING') && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                    {(booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW') && <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                    {['PENDING'].includes(booking.payment_state) && <Clock className="w-3.5 h-3.5 mr-1" />}
                    {booking.payment_state.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleManage(booking)}
                    className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl transition-colors shadow-sm ${
                        booking.payment_state === 'PAID' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' :
                        booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {booking.payment_state === 'PAID' ? <Eye className="w-4 h-4 mr-2" /> : booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? <ShieldCheck className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    {booking.payment_state === 'PAID' ? 'View Details' : booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'Review Proof' : 'Manage Payment'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {bulkAlertModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-xl font-extrabold text-slate-800 mb-2 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-amber-500" /> Bulk Payment Warning
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              You are about to send a Payment Warning to <strong>{selectedIds.length}</strong> applicant(s). The system will dynamically append "This is your nth warning" to each message.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Custom Message *</label>
              <textarea 
                value={bulkAlertModal.message} 
                onChange={e => setBulkAlertModal({ ...bulkAlertModal, message: e.target.value })} 
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                rows="4"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setBulkAlertModal({ isOpen: false, message: '' })} 
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitBulkAlert} 
                disabled={isSending || !bulkAlertModal.message.trim()}
                className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSending ? 'Sending...' : 'Send Warnings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
