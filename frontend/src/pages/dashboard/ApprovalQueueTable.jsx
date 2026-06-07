import React from 'react';
import { LayoutDashboard, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import { getFormattedBookingId } from '../../utils/booking';

export default function ApprovalQueueTable({
  activeTab,
  bookings,
  setPreviewId,
  handleUpdateStatus,
  handleMockPay,
  handleDelete,
  handleWithdrawDecision,
}) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <LayoutDashboard className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Bookings Found</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          There are currently no {activeTab === 'approvals' ? 'pending' : 'approved'} accommodation
          requests.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <th className="p-4 font-bold">Booking ID</th>
            <th className="p-4 font-bold">Applicant</th>
            <th className="p-4 font-bold">Arrival</th>
            <th className="p-4 font-bold">Rooms</th>
            <th className="p-4 font-bold">Status</th>
            <th className="p-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <React.Fragment key={booking.booking_id}>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <span className="inline-block font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 break-all leading-snug">
                    {getFormattedBookingId(booking)}
                  </span>
                </td>
                <td className="p-4">
                  <p className="font-bold text-slate-800">{booking.applicant_name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {booking.department}
                    {booking.applicant_role
                      ? ` | ${String(booking.applicant_role).replace(/_/g, ' ')}`
                      : ''}
                  </p>
                </td>
                <td className="p-4">
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(booking.arrival_datetime).toLocaleDateString()}
                  </p>
                </td>
                <td className="p-4 text-sm font-medium text-slate-800">{booking.rooms_required}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${booking.booking_state === 'APPROVED' || booking.booking_state === 'CONFIRMED' ? 'bg-green-100 text-green-800' : booking.booking_state === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {booking.booking_state.startsWith('PENDING_')
                      ? 'Pending Approval'
                      : booking.booking_state.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => setPreviewId(booking.booking_id)}
                    className="inline-flex items-center p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm"
                    title="Preview Application"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {booking.booking_state === 'PENDING_ADMIN' && (
                      <button
                        onClick={() => handleUpdateStatus(booking.booking_id, 'APPROVED')}
                        className="inline-flex items-center p-2 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors border border-green-200 shadow-sm"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                  )}
                  {booking.booking_state.startsWith('PENDING_') && (
                      <button
                        onClick={() => handleUpdateStatus(booking.booking_id, 'REJECTED')}
                        className="inline-flex items-center p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                  )}
                  {booking.booking_state === 'APPROVED' && (
                    <button
                      onClick={() => handleMockPay(booking.booking_id)}
                      className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                  {booking.payment_state === 'PAID' && (
                    <button
                      onClick={() => alert('Mock Receipt Generated!')}
                      className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors"
                    >
                      Receipt
                    </button>
                  )}
                  {!['CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.booking_state) && !booking.booking_state.startsWith('PENDING_') && (
                    <button
                      onClick={() => {
                        const isRej = booking.booking_state.includes('REJECT');
                        const msg = isRej 
                          ? 'Are you sure you want to withdraw your rejection for this booking? This will return it to your pending queue.'
                          : 'Are you sure you want to withdraw your approval for this booking? This will return it to your pending queue.';
                        if (window.confirm(msg)) {
                          handleWithdrawDecision(booking.booking_id);
                        }
                      }}
                      className="inline-flex items-center p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border border-slate-200 shadow-sm ml-2"
                      title="Withdraw Decision"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
