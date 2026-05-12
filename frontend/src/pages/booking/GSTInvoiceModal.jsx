import React from 'react';
import { X, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GSTInvoiceModal({ bookingId, bookingData, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
    enabled: !!bookingId && !bookingData, // Only fetch if we didn't pass the data
    initialData: bookingData ? { data: bookingData } : undefined // Eliminates the loading lag!
  });

  if (isLoading) return <div className="fixed inset-0 z-[200] bg-slate-900/70 flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data?.data) return null;

  const booking = data.data;

  // Calculate Invoice Data
  const arrival = new Date(booking.arrival_datetime || booking.checked_in_at);
  const departure = new Date(booking.checked_out_at || booking.departure_datetime);
  const ms = Math.max(0, departure - arrival);
  const nights = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  
  // Financials
  const totalEstimated = Number(booking.total_estimated_amount) || 0;
  // Back-calculate subtotal assuming 12% GST (6% CGST + 6% SGST)
  const subtotal = Math.round(totalEstimated / 1.12);
  const cgst = Math.round(subtotal * 0.06);
  const sgst = totalEstimated - subtotal - cgst; // Catch any rounding remainders

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <div className="bg-white w-full max-w-4xl mx-auto shadow-2xl relative my-auto print:shadow-none print:my-0">
        {/* Header / Action bar */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200 print:hidden sticky top-0">
          <h3 className="font-bold text-slate-700">Invoice Preview</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 shadow-sm transition-colors">
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-10 print:p-8 bg-white text-slate-800 font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">National Institute of Technology</h1>
              <p className="text-sm text-slate-600 font-bold mt-1">Guest House Management</p>
              <p className="text-sm text-slate-600 mt-1">Tiruchirappalli, Tamil Nadu 620015, India</p>
              <p className="text-sm text-slate-600">Phone: +91 431 2503000</p>
              <p className="text-sm text-slate-600">Website: www.nitt.edu</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-light text-slate-300 uppercase tracking-widest mb-4">INVOICE</h2>
              <table className="w-full text-right text-sm border-none">
                <tbody>
                  <tr><td className="font-bold text-slate-500 pr-4 pb-1 uppercase text-xs">Date</td><td className="text-slate-800 pb-1 font-medium">{new Date().toLocaleDateString('en-IN')}</td></tr>
                  <tr><td className="font-bold text-slate-500 pr-4 pb-1 uppercase text-xs">Invoice #</td><td className="text-slate-800 pb-1 font-mono font-medium">{booking.invoice_id?.split('-')[0].toUpperCase() || `INV-${booking.booking_id.split('-')[0].toUpperCase()}`}</td></tr>
                  <tr><td className="font-bold text-slate-500 pr-4 uppercase text-xs">Booking ID</td><td className="text-slate-800 font-mono font-medium">{booking.booking_id.split('-')[0].toUpperCase()}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">BILL TO</h3>
            <div className="text-sm text-slate-700 space-y-1">
              <p className="text-lg font-bold text-slate-900">{booking.applicant_name || 'N/A'}</p>
              {booking.department && <p>{booking.department}</p>}
              <p>{booking.applicant_email}</p>
              <p className="mt-2"><span className="font-bold">Category:</span> {booking.category_code || `CAT-${booking.category_id}`}</p>
              <p><span className="font-bold">Purpose:</span> {booking.purpose_of_visit}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse mb-10 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 text-left font-bold w-12 border-slate-800 border">No.</th>
                <th className="p-3 text-left font-bold border-slate-800 border">PRODUCT / SERVICE</th>
                <th className="p-3 text-left font-bold border-slate-800 border">DESCRIPTION</th>
                <th className="p-3 text-center font-bold w-24 border-slate-800 border">QTY</th>
                <th className="p-3 text-right font-bold w-32 border-slate-800 border">RATE</th>
                <th className="p-3 text-right font-bold w-32 border-slate-800 border">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-200">
                <td className="p-3 border-l border-slate-200">1</td>
                <td className="p-3 font-bold text-slate-800">Accommodation Charges</td>
                <td className="p-3">
                  {booking.rooms_required} Room(s) - {booking.room_type}
                  {booking.extra_beds > 0 ? `, ${booking.extra_beds} Extra Bed(s)` : ''}
                  <br/>
                  <span className="text-xs text-slate-500">
                    {arrival.toLocaleDateString('en-IN')} to {departure.toLocaleDateString('en-IN')}
                  </span>
                </td>
                <td className="p-3 text-center">{nights} Night(s)</td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right border-r border-slate-200">₹ {subtotal.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 border-l border-slate-200">&nbsp;</td>
                <td className="p-3"></td>
                <td className="p-3"></td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-right"></td>
                <td className="p-3 text-right border-r border-slate-200"></td>
              </tr>
            </tbody>
          </table>

          {/* Summary and Terms */}
          <div className="flex justify-between items-start mt-4">
            <div className="w-1/2 pr-8">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3">Terms & Conditions</h4>
              <ul className="text-xs text-slate-600 space-y-2 list-none">
                <li>1. All payments must be cleared before or during checkout.</li>
                <li>2. Please include the invoice number on your transfer reference.</li>
                <li>3. Make all checks / online payments payable to: <strong>Director, NIT Tiruchirappalli</strong>.</li>
              </ul>
              
              <div className="mt-8">
                <p className="text-sm font-bold text-slate-800 italic">Thank You For Your Stay!</p>
              </div>
            </div>

            <div className="w-1/2 max-w-sm">
              <table className="w-full text-right text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 text-slate-600 font-bold uppercase text-xs">Subtotal</td>
                    <td className="py-2 text-slate-800 font-medium">₹ {subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600 font-bold uppercase text-xs">CGST (6%)</td>
                    <td className="py-2 text-slate-800 font-medium">₹ {cgst.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600 font-bold uppercase text-xs border-b border-slate-300">SGST (6%)</td>
                    <td className="py-2 text-slate-800 font-medium border-b border-slate-300">₹ {sgst.toFixed(2)}</td>
                  </tr>
                  <tr className="text-xl">
                    <td className="py-4 text-slate-900 font-black">TOTAL</td>
                    <td className="py-4 text-slate-900 font-black">₹ {totalEstimated.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              
              {/* Payment Status Stamp */}
              <div className="mt-6 border-t-2 border-slate-800 pt-4 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Status</span>
                  <span className={`text-lg font-black uppercase tracking-widest border-2 px-3 py-1 rounded ${booking.payment_state === 'PAID' ? 'text-green-600 border-green-600' : 'text-amber-500 border-amber-500'}`}>
                      {booking.payment_state || 'PENDING'}
                  </span>
              </div>
            </div>
          </div>
          
          <div className="mt-16 pt-6 border-t border-slate-200 text-center flex justify-between items-end">
            <p className="text-xs text-slate-400 italic">This is a computer-generated invoice. No signature is required.</p>
            <div className="text-center">
              <div className="h-10 w-48 border-b border-slate-400 mb-2"></div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Authorized Signatory</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}