const PDFDocument = require('pdfkit');
const db = require('../db/db');

/**
 * Generates a GST-compliant invoice PDF buffer for a given booking.
 * SAC Code: 996311 (Room/accommodation services)
 */
exports.generateGSTInvoice = async (bookingId, client) => {
  const runQ = (sql, p) => client ? client.query(sql, p) : db.query(sql, p);

  const billRes = await runQ(
    `SELECT fb.*, br.arrival_datetime, br.departure_datetime, br.rooms_required,
            br.room_type, br.category_id, br.payment_responsible,
            u.full_name as applicant_name, u.email as applicant_email,
            br.booking_seq, br.formatted_id
     FROM final_bills fb
     JOIN booking_requests br ON fb.booking_id = br.booking_id
     JOIN users u ON br.user_id = u.user_id
     WHERE fb.booking_id = $1`, [bookingId]
  );
  const bill = billRes.rows[0];
  if (!bill) throw new Error('Bill not found for booking: ' + bookingId);

  const configRes = await runQ(
    `SELECT * FROM institution_configs WHERE config_id = 1`, []
  );
  const config = configRes.rows[0] || {};

  const guestRes = await runQ(
    `SELECT g.guest_name, g.relation_to_applicant,
            grs.operational_room_type, grs.operational_tariff,
            grs.occupancy_type, grs.extra_bed,
            grs.checked_in_at, grs.checked_out_at,
            r.room_number
     FROM guest_room_stays grs
     JOIN guests g ON grs.guest_id = g.guest_id
     JOIN rooms r ON grs.room_id = r.room_id
     WHERE grs.booking_id = $1 AND grs.stay_status IN ('CHECKED_IN', 'CHECKED_OUT')`, [bookingId]
  );
  const stays = guestRes.rows;

  // GST calculation
  const billJson = typeof bill.generated_json === 'string'
    ? JSON.parse(bill.generated_json) : (bill.generated_json || {});

  const subtotal = parseFloat(bill.subtotal) || 0;
  const gstTotal = parseFloat(bill.gst) || 0;
  const total = parseFloat(bill.total) || 0;

  // Determine IGST vs CGST+SGST
  const gstType = billJson.gst_type || 'CGST_SGST';
  const halfGst = parseFloat((gstTotal / 2).toFixed(2));

  // Build PDF
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  const pageW = 595 - 80; // usable width at margin 40 each side

  // ── Header ──
  doc.fontSize(16).font('Helvetica-Bold')
     .text(config.legal_name || 'NIT Trichy Guest House', 40, 40, { align: 'center', width: pageW });
  doc.fontSize(9).font('Helvetica')
     .text(config.address || 'National Institute of Technology, Tiruchirappalli - 620015', 
           40, 62, { align: 'center', width: pageW });
  doc.text(`GSTIN: ${config.gstin || 'N/A'}  |  PAN: ${config.pan || 'N/A'}`, 
           40, 74, { align: 'center', width: pageW });

  doc.moveTo(40, 88).lineTo(555, 88).stroke();

  // ── Invoice meta ──
  doc.fontSize(13).font('Helvetica-Bold')
     .text('TAX INVOICE', 40, 96, { align: 'center', width: pageW });

  doc.fontSize(9).font('Helvetica');
  const metaY = 116;
  doc.text(`Invoice No: ${bill.invoice_number || 'DRAFT'}`, 40, metaY);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString('en-IN')}`, 350, metaY);
  doc.text(`Booking ID: ${bill.formatted_id || bookingId}`, 40, metaY + 14);
  doc.text(`SAC Code: ${config.sac_code || '996311'}`, 350, metaY + 14);
  doc.text(`Payment Mode: ${bill.payment_mode || 'N/A'}`, 40, metaY + 28);
  if (bill.transaction_ref) {
    doc.text(`Transaction Ref: ${bill.transaction_ref}`, 350, metaY + 28);
  }

  doc.moveTo(40, metaY + 44).lineTo(555, metaY + 44).stroke();

  // ── Guest / Applicant info ──
  const guestY = metaY + 52;
  doc.fontSize(9).font('Helvetica-Bold').text('Billed To:', 40, guestY);
  doc.font('Helvetica')
     .text(bill.applicant_name || 'Guest', 40, guestY + 12)
     .text(bill.applicant_email || '', 40, guestY + 24);

  doc.moveTo(40, guestY + 40).lineTo(555, guestY + 40).stroke();

  // ── Stay details table ──
  const tableY = guestY + 50;
  const cols = { room: 40, guest: 100, type: 230, checkin: 310, checkout: 390, tariff: 470 };

  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Room', cols.room, tableY);
  doc.text('Guest', cols.guest, tableY);
  doc.text('Occupancy', cols.type, tableY);
  doc.text('Check-in', cols.checkin, tableY);
  doc.text('Check-out', cols.checkout, tableY);
  doc.text('Amount', cols.tariff, tableY, { align: 'right', width: 65 });

  doc.moveTo(40, tableY + 12).lineTo(555, tableY + 12).stroke();

  let rowY = tableY + 16;
  doc.fontSize(8).font('Helvetica');
  for (const stay of stays) {
    const cin = stay.checked_in_at ? new Date(stay.checked_in_at).toLocaleDateString('en-IN') : '-';
    const cout = stay.checked_out_at ? new Date(stay.checked_out_at).toLocaleDateString('en-IN') : '-';
    const amt = stay.operational_tariff
      ? `₹${parseFloat(stay.operational_tariff).toFixed(2)}` : '-';
    const occ = `${stay.occupancy_type || ''}${stay.extra_bed ? '+ExtraBed' : ''}`;

    doc.text(stay.room_number || '-', cols.room, rowY, { width: 55 });
    doc.text(stay.guest_name || '-', cols.guest, rowY, { width: 125 });
    doc.text(occ, cols.type, rowY, { width: 75 });
    doc.text(cin, cols.checkin, rowY, { width: 75 });
    doc.text(cout, cols.checkout, rowY, { width: 75 });
    doc.text(amt, cols.tariff, rowY, { align: 'right', width: 65 });
    rowY += 14;
  }

  // Food charges row if present
  const foodCharges = billJson.food_total || 0;
  if (foodCharges > 0) {
    doc.text('—', cols.room, rowY);
    doc.text('Food charges', cols.guest, rowY, { width: 200 });
    doc.text(`₹${parseFloat(foodCharges).toFixed(2)}`, cols.tariff, rowY, 
             { align: 'right', width: 65 });
    rowY += 14;
  }

  doc.moveTo(40, rowY).lineTo(555, rowY).stroke();
  rowY += 8;

  // ── Totals ──
  const totX = 380;
  const totValX = 460;
  const totW = 95;

  doc.fontSize(9).font('Helvetica');
  doc.text('Subtotal (excl. GST):', totX, rowY);
  doc.text(`₹${subtotal.toFixed(2)}`, totValX, rowY, { align: 'right', width: totW });
  rowY += 14;

  if (gstType === 'IGST') {
    doc.text(`IGST @ ${billJson.gst_rate || 12}%:`, totX, rowY);
    doc.text(`₹${gstTotal.toFixed(2)}`, totValX, rowY, { align: 'right', width: totW });
    rowY += 14;
  } else {
    doc.text(`CGST @ ${(billJson.gst_rate || 12) / 2}%:`, totX, rowY);
    doc.text(`₹${halfGst.toFixed(2)}`, totValX, rowY, { align: 'right', width: totW });
    rowY += 14;
    doc.text(`SGST @ ${(billJson.gst_rate || 12) / 2}%:`, totX, rowY);
    doc.text(`₹${halfGst.toFixed(2)}`, totValX, rowY, { align: 'right', width: totW });
    rowY += 14;
  }

  doc.moveTo(totX, rowY).lineTo(555, rowY).stroke();
  rowY += 6;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Total Amount:', totX, rowY);
  doc.text(`₹${total.toFixed(2)}`, totValX, rowY, { align: 'right', width: totW });
  rowY += 18;

  doc.font('Helvetica').fontSize(8)
     .text(`Amount in words: ${amountInWords(total)}`, 40, rowY);
  rowY += 20;

  // ── Signatory ──
  doc.moveTo(40, rowY).lineTo(555, rowY).stroke();
  rowY += 10;
  doc.fontSize(8).font('Helvetica')
     .text('This is a computer-generated invoice and does not require a physical signature.', 
           40, rowY, { align: 'center', width: pageW });
  rowY += 12;
  if (config.signatory_name) {
    doc.text(`Authorised Signatory: ${config.signatory_name}`, 40, rowY);
    if (config.signatory_designation) {
      doc.text(config.signatory_designation, 40, rowY + 12);
    }
  }

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
};

// ── Utility: amount in words (Indian numbering) ──
function amountInWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
    'Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + convert(n % 10);
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n/1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n/100000)) + 'Lakh ' + convert(n % 100000);
    return convert(Math.floor(n/10000000)) + 'Crore ' + convert(n % 10000000);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise';
  return result + ' Only';
}
