import React from 'react';
import { FileText, Trash2 } from 'lucide-react';

export default function MyBookingsTable({ bookings, handleOpenPayment, handleDelete }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Bookings Found</h3>
        <p className="text-slate-500 max-w-md mx-auto">You have not submitted any accommodation requests yet.</p>
      </div>
    );
  }

  return (
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
          {bookings.map((booking) => (
            <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-mono text-xs text-slate-500">{booking.booking_id}</td>
              <td className="p-4 text-sm font-medium text-slate-800">{new Date(booking.arrival_datetime).toLocaleDateString()}</td>
              <td className="p-4 text-sm font-medium text-slate-800">{new Date(booking.departure_datetime).toLocaleDateString()}</td>
              <td className="p-4 text-sm font-medium text-slate-800">{booking.rooms_required}</td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${booking.booking_state === 'APPROVED' || booking.booking_state === 'CONFIRMED' ? 'bg-green-100 text-green-800' : booking.booking_state === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {booking.booking_state.startsWith('PENDING_') ? 'Pending Approval' : booking.booking_state.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="p-4 text-right space-x-2 whitespace-nowrap">
                {(() => {
                  const showPaymentBtn = Number(booking.total_estimated_amount) > 0 &&
                                         booking.payment_responsible !== 'institute' &&
                                         !['DRAFT', 'CANCELLED', 'ADMIN_REJECTED', 'APPROVER_REJECTED'].includes(booking.booking_state);
                  return (
                    <>
                      {showPaymentBtn && (
                          <button
                              onClick={() => handleOpenPayment(booking)}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors mr-2 ${booking.payment_state === 'PAID' ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' : booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'bg-amber-500 text-white hover:bg-amber-600' : booking.payment_state === 'REJECTED' || booking.payment_state.includes('WARNING') ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                          >
                              {booking.payment_state === 'PAID' ? 'View Payment' : booking.payment_state.includes('PROOF') || booking.payment_state === 'UNDER_REVIEW' ? 'Proof Under Review' : 'Pay / Upload Proof'}
                          </button>
                      )}
                      {['PENDING_APPROVER', 'PENDING_ADMIN', 'ADMIN_APPROVED'].includes(booking.booking_state) && (
                        <button onClick={() => handleDelete(booking.booking_id)} className="inline-flex items-center p-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm" title="Delete Request"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}