import React from 'react';
import { X, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../../services/booking.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Helper to convert number to words (Indian numbering system)
function numberToWords(num) {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
    return str.trim();
}

export default function GSTInvoiceModal({ bookingId, bookingData, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
    enabled: !!bookingId && !bookingData, 
    initialData: bookingData ? { data: bookingData } : undefined 
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
  let totalEstimated = Number(booking.total_estimated_amount) || 0;
  let subtotal = Math.round(totalEstimated / 1.12);
  let cgst = Math.round(subtotal * 0.06);
  let sgst = totalEstimated - subtotal - cgst; // Catch any rounding remainders

  if (booking.final_bill) {
      subtotal = Number(booking.final_bill.subtotal);
      cgst = Number(booking.final_bill.gst) / 2;
      sgst = cgst;
      totalEstimated = Number(booking.final_bill.total);
  }

  const amountInWords = numberToWords(Math.round(totalEstimated));
  const invoiceNo = booking.invoice_id?.split('-')[0].toUpperCase() || `INV-${booking.booking_id.split('-')[0].toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN');

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <div className="bg-white w-full max-w-4xl mx-auto shadow-2xl relative my-auto print:shadow-none print:my-0 border border-slate-300">
        {/* Header / Action bar */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200 print:hidden sticky top-0 z-10">
          <h3 className="font-bold text-slate-700">GST Invoice Preview</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 print:p-0 bg-white text-slate-900 font-sans text-sm">
          
          <div className="text-center mb-6">
            <h2 className="text-xl font-black uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1 mb-4">Tax Invoice</h2>
          </div>

          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
            <div className="w-1/2 pr-4">
                <h1 className="text-xl font-black uppercase text-slate-900 mb-1">National Institute of Technology</h1>
                <p className="font-bold text-slate-700 text-xs mb-2">Guest House Management</p>
                <div className="text-xs text-slate-700 space-y-1">
                    <p>Tanjore Main Road, National Highway 67,</p>
                    <p>Tiruchirappalli, Tamil Nadu 620015</p>
                    <p><span className="font-bold">State Code:</span> 33 (Tamil Nadu)</p>
                    <p><span className="font-bold">GSTIN:</span> 33AAAAA0000A1Z5 <span className="text-[10px] text-slate-400 italic">(Sample)</span></p>
                    <p><span className="font-bold">PAN:</span> AAAAA0000A</p>
                </div>
            </div>
            <div className="w-1/2 pl-4 border-l border-slate-300">
                <table className="w-full text-xs">
                    <tbody>
                        <tr>
                            <td className="py-1 font-bold w-32">Invoice No:</td>
                            <td className="py-1 font-mono font-medium">{invoiceNo}</td>
                        </tr>
                        <tr>
                            <td className="py-1 font-bold">Invoice Date:</td>
                            <td className="py-1 font-medium">{invoiceDate}</td>
                        </tr>
                        <tr>
                            <td className="py-1 font-bold">Place of Supply:</td>
                            <td className="py-1 font-medium">33 - Tamil Nadu</td>
                        </tr>
                        <tr>
                            <td className="py-1 font-bold">Booking Ref:</td>
                            <td className="py-1 font-mono font-medium">{booking.booking_id.split('-')[0].toUpperCase()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>

          {/* Billed To */}
          <div className="border border-slate-300 mb-6 flex">
            <div className="w-1/2 p-4 border-r border-slate-300 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Billed To (Customer Details)</h3>
                <div className="text-xs space-y-1">
                    <p className="font-bold text-sm uppercase">{booking.applicant_name || 'N/A'}</p>
                    {booking.department && <p>{booking.department}</p>}
                    <p>{booking.applicant_email}</p>
                    <p className="mt-2"><span className="font-bold">Category:</span> {booking.category_code || `CAT-${booking.category_id}`}</p>
                    <p><span className="font-bold">State Code:</span> 33 (Tamil Nadu)</p>
                </div>
            </div>
            <div className="w-1/2 p-4 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">Stay Details</h3>
                <div className="text-xs space-y-1">
                    <p><span className="font-bold">Arrival:</span> {arrival.toLocaleString('en-IN')}</p>
                    <p><span className="font-bold">Departure:</span> {departure.toLocaleString('en-IN')}</p>
                    <p><span className="font-bold">Duration:</span> {nights} Night(s)</p>
                    <p><span className="font-bold">Payment Status:</span> <span className="uppercase font-bold">{booking.payment_state || 'PENDING'}</span></p>
                </div>
            </div>
          </div>

          {/* Item Table */}
          <table className="w-full border-collapse border border-slate-300 text-xs mb-2">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                <th className="p-2 border-r border-slate-300 text-center w-10">S.No</th>
                <th className="p-2 border-r border-slate-300 text-left">Description of Service</th>
                <th className="p-2 border-r border-slate-300 text-center w-20">SAC Code</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">Qty</th>
                <th className="p-2 border-r border-slate-300 text-right w-24">Rate (₹)</th>
                <th className="p-2 text-right w-28">Taxable Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300 h-32 align-top">
                <td className="p-2 border-r border-slate-300 text-center">1</td>
                <td className="p-2 border-r border-slate-300">
                  <p className="font-bold">Accommodation Services</p>
                  <p className="text-slate-600 mt-1">Room Type: {booking.room_type}</p>
                  <p className="text-slate-600">Rooms: {booking.rooms_required} | Extra Beds: {booking.extra_beds > 0 ? booking.extra_beds : 0}</p>
                </td>
                <td className="p-2 border-r border-slate-300 text-center">9963</td>
                <td className="p-2 border-r border-slate-300 text-center">{nights} Night(s)</td>
                <td className="p-2 border-r border-slate-300 text-right">
                    {/* Rate logic is tricky since it's a bulk sum. We show the average rate. */}
                    {(subtotal / nights).toFixed(2)}
                </td>
                <td className="p-2 text-right font-bold">{subtotal.toFixed(2)}</td>
              </tr>
              
              {/* Totals Row */}
              <tr className="border-b border-slate-300">
                <td colSpan="5" className="p-2 border-r border-slate-300 text-right font-bold">Total Taxable Value</td>
                <td className="p-2 text-right font-bold">{subtotal.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td colSpan="5" className="p-2 border-r border-slate-300 text-right font-bold text-slate-700">Add: CGST @ 6%</td>
                <td className="p-2 text-right text-slate-700">{cgst.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-300 bg-slate-50">
                <td colSpan="5" className="p-2 border-r border-slate-300 text-right font-bold text-slate-700">Add: SGST @ 6%</td>
                <td className="p-2 text-right text-slate-700">{sgst.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-100 text-sm">
                <td colSpan="5" className="p-3 border-r border-slate-300 text-right font-black uppercase tracking-wider">Grand Total (₹)</td>
                <td className="p-3 text-right font-black">{totalEstimated.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="border border-slate-300 p-3 mb-6 bg-slate-50">
            <p className="text-xs"><span className="font-bold">Total Invoice Amount in Words:</span> Indian Rupees {amountInWords}</p>
          </div>

          {/* Footer details */}
          <div className="flex justify-between items-end border border-slate-300 p-4">
            <div className="w-1/2">
                <h4 className="text-xs font-bold uppercase mb-2 underline">Terms & Conditions</h4>
                <ul className="text-[10px] space-y-1 text-slate-700 list-decimal pl-4">
                    <li>Payment is due immediately upon generation of invoice.</li>
                    <li>Subject to Tiruchirappalli jurisdiction.</li>
                    <li>This is a computer generated invoice.</li>
                </ul>
                <div className="mt-4 text-[10px] text-slate-500">
                    <p><span className="font-bold text-slate-700">Bank Details for NEFT/RTGS:</span></p>
                    <p>A/C Name: Director, NIT Tiruchirappalli</p>
                    <p>Bank: State Bank of India | Branch: NIT Trichy</p>
                    <p>IFSC Code: SBIN0001617</p>
                </div>
            </div>
            <div className="w-1/2 text-right flex flex-col justify-end items-end h-32">
                <div className="text-center">
                    <div className="w-48 border-b-2 border-slate-400 mb-2 border-dashed"></div>
                    <p className="text-xs font-bold uppercase">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-500">For NIT Tiruchirappalli Guest House</p>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}