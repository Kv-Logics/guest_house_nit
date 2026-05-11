export default function PaymentsTable({ bookings, handleMockPay }) {
  const paymentBookings = bookings.filter(
    (b) => b.booking_state === 'APPROVED' || b.payment_state === 'PAID'
  );

  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h3 className="text-lg font-bold text-slate-800">Pending Payments</h3>
        <p className="text-sm text-slate-500">
          Bookings that have been approved and require payment.
        </p>
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
          {paymentBookings.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                No pending payments found.
              </td>
            </tr>
          ) : (
            paymentBookings.map((booking) => (
              <tr key={booking.booking_id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-xs text-slate-500">{booking.booking_id}</td>
                <td className="p-4 font-bold text-emerald-700">
                  ₹{booking.total_estimated_amount || 0}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${booking.payment_state === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {booking.payment_state}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {booking.payment_state === 'PENDING' && booking.booking_state === 'APPROVED' && (
                    <button
                      onClick={() => handleMockPay(booking.booking_id)}
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                  {booking.payment_state === 'PAID' && (
                    <button
                      onClick={() => alert('Mock Receipt Generated!')}
                      className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors"
                    >
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
  );
}
