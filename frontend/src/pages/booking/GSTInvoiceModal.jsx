import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import nitLogo from '../../assets/images/nitlogo.png';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function GSTInvoiceModal({ bookingId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
    enabled: !!bookingId
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      
      {/* Modal Container */}
      <div className="bg-white w-full max-w-4xl mx-auto rounded-2xl shadow-2xl relative my-auto print:shadow-none print:rounded-none print:my-0">
        
        {/* Non-Printable Action Bar */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl print:hidden sticky top-0 z-10">
          <h3 className="font-bold text-slate-700">Invoice Preview</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- PRINTABLE INVOICE CONTENT --- */}
        <div className="p-10 print:p-6 bg-white text-slate-800 font-sans" id="invoice-content">
          
          {/* 1. Header Section */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <img src={nitLogo} alt="NIT Logo" className="w-20 h-20 object-contain" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">National Institute of Technology</h1>
                <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Guest House Management</h2>
                <p className="text-xs text-slate-500 mt-1">Tiruchirappalli, Tamil Nadu 620015, India</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">GSTIN: <span className="font-mono text-slate-800">33AAAAA0000A1Z5</span> (Demo)</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-blue-800 uppercase tracking-widest mb-2">GST Invoice</h2>
              <p className="text-sm font-bold text-slate-600">Invoice No: <span className="font-mono text-slate-900">{booking.invoice_id?.split('-')[0].toUpperCase() || `INV-${booking.booking_id.split('-')[0].toUpperCase()}`}</span></p>
              <p className="text-sm font-bold text-slate-600">Date: <span className="text-slate-900">{new Date().toLocaleDateString('en-IN')}</span></p>
            </div>
          </div>

          {/* 2 & 3. Guest & Stay Details Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Billed To */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Billed To (Applicant Details)</h3>
              <p className="text-base font-extrabold text-slate-800">{booking.applicant_name || 'N/A'}</p>
              <p className="text-sm text-slate-600 mt-1 font-medium">{booking.applicant_email}</p>
              {booking.department && <p className="text-sm font-bold text-slate-700 mt-2">Department: <span className="font-medium text-slate-600">{booking.department}</span></p>}
              <p className="text-sm font-bold text-slate-700 mt-2">Purpose: <span className="font-medium text-slate-600">{booking.purpose_of_visit}</span></p>
              <p className="text-sm font-bold text-slate-700 mt-2">Guest(s): <span className="font-medium text-slate-600">{booking.guests ? booking.guests.map(g => g.guest_name).join(', ') : 'N/A'}</span></p>
            </div>
            
            {/* Stay Info */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Stay Details</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="font-bold text-slate-600">Booking ID:</span>
                <span className="font-mono font-medium text-slate-800">{booking.booking_id.split('-')[0].toUpperCase()}</span>
                
                <span className="font-bold text-slate-600">Category:</span>
                <span className="font-bold text-slate-800">{booking.category_code || `CAT-${booking.category_id}`}</span>
                
                <span className="font-bold text-slate-600">Rooms & Beds:</span>
                <span className="font-bold text-slate-800">{booking.rooms_required} Room(s){booking.extra_beds > 0 ? `, ${booking.extra_beds} Extra Bed(s)` : ''}</span>
                
                <span className="font-bold text-slate-600">Room No(s):</span>
                <span className="font-bold text-slate-800">{booking.allocated_room_numbers || 'Not Recorded'}</span>
                
                <span className="font-bold text-slate-600">Room Type:</span>
                <span className="font-medium text-slate-800">{booking.room_type || 'Standard Room'}</span>
                
                <span className="font-bold text-slate-600">Check-In:</span>
                <span className="font-medium text-slate-800">{arrival.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                
                <span className="font-bold text-slate-600">Check-Out:</span>
                <span className="font-medium text-slate-800">{departure.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                
                <span className="font-bold text-slate-600">Duration:</span>
                <span className="font-medium text-slate-800">{nights} Night(s)</span>
              </div>
            </div>
          </div>

          {/* 4. Bill Summary Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-sm">
                  <th className="border border-slate-300 p-3 text-left font-bold">Description</th>
                  <th className="border border-slate-300 p-3 text-center font-bold">Qty / Nights</th>
                  <th className="border border-slate-300 p-3 text-right font-bold">Rate (₹)</th>
                  <th className="border border-slate-300 p-3 text-right font-bold">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                <tr>
                  <td className="border border-slate-300 p-3 font-medium">Accommodation Charges ({booking.rooms_required} Room{booking.rooms_required > 1 ? 's' : ''}{booking.extra_beds > 0 ? `, ${booking.extra_beds} Extra Bed(s)` : ''})</td>
                  <td className="border border-slate-300 p-3 text-center">{nights}</td>
                  <td className="border border-slate-300 p-3 text-right">-</td>
                  <td className="border border-slate-300 p-3 text-right">{subtotal}</td>
                </tr>
              </tbody>
            </table>
            
            {/* Totals Section */}
            <div className="flex justify-end mt-4">
              <div className="w-72">
                <div className="flex justify-between py-1.5 text-sm font-bold text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹ {subtotal}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-bold text-slate-600">
                  <span>CGST (6%):</span>
                  <span>₹ {cgst}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-bold text-slate-600 border-b-2 border-slate-800 pb-2">
                  <span>SGST (6%):</span>
                  <span>₹ {sgst}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span>₹ {totalEstimated}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 & 6. Payment Info & Footer */}
          <div className="flex justify-between items-end pt-8 border-t border-slate-200">
            <div className="text-sm space-y-1">
              <p className="font-bold text-slate-700">Payment Status: <span className={booking.payment_state === 'PAID' ? 'text-green-700' : 'text-amber-600 uppercase'}>{booking.payment_state || 'PENDING'}</span></p>
              <p className="font-bold text-slate-700">Payment Mode: <span className="font-medium text-slate-600">{booking.payment_state === 'PAID' ? 'Online / Desk Setup' : 'N/A'}</span></p>
              <p className="text-xs text-slate-400 mt-4 italic max-w-sm">This is a computer-generated invoice. The GST number used is for demonstration/sample purposes only.</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-48 border-b border-slate-400 mb-2"></div>
              <p className="text-sm font-bold text-slate-800">Authorized Signatory</p>
              <p className="text-xs text-slate-500">NITT Guest House Admin</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}