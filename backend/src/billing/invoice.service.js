const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

// Utility: amount in words
function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + convert(n % 10);
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + ' Crore ' + convert(n % 10000000);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise';
  return result + ' Only';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStateName(stateCode) {
  const states = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka',
    '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
  };
  return states[stateCode] || 'Other State';
}

exports.generateGSTInvoice = async (bookingId, client = null) => {
  const runQ = (sql, p) => client ? client.query(sql, p) : db.query(sql, p);

  const billRes = await runQ(
    `SELECT fb.*, br.arrival_datetime, br.departure_datetime, br.rooms_required,
            br.room_type, br.category_id, br.payment_responsible, fb.billing_type, fb.company_name, fb.company_address, fb.gstin,
            u.full_name as applicant_name, u.email as applicant_email,
            br.booking_seq, br.formatted_id
     FROM final_bills fb
     JOIN booking_requests br ON fb.booking_id = br.booking_id
     JOIN users u ON br.user_id = u.user_id
     WHERE fb.booking_id = $1`, [bookingId]
  );
  const bill = billRes.rows[0];
  if (!bill) throw new Error('Bill not found for booking: ' + bookingId);

  const configRes = await runQ(`SELECT * FROM institution_configs WHERE config_id = 1`, []);
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

  let settledByName = 'Receptionist';
  if (bill.generated_by) {
    const userRes = await runQ(`SELECT full_name FROM users WHERE user_id = $1`, [bill.generated_by]);
    if (userRes.rows.length > 0) settledByName = userRes.rows[0].full_name;
  }

  const billJson = typeof bill.generated_json === 'string' ? JSON.parse(bill.generated_json) : (bill.generated_json || {});
  
  const subtotal = parseFloat(bill.subtotal) || 0;
  const gstTotal = parseFloat(bill.gst) || 0;
  const total = parseFloat(bill.total) || 0;
  const gstType = billJson.gst_type || 'CGST_SGST';
  const halfGst = parseFloat((gstTotal / 2).toFixed(2));
  
  // Choose template
  const isB2B = bill.billing_type === 'B2B';
  const templateName = isB2B ? 'gst_invoice_b2b.html' : 'gst_invoice_guesthouse_v2.html';
  const templatePath = path.join(__dirname, 'templates', templateName);
  
  let html = fs.readFileSync(templatePath, 'utf8');

  // Calculate booking-level nights for the meta header
  const checkInDate = bill.arrival_datetime ? new Date(bill.arrival_datetime) : new Date();
  const checkOutDate = bill.departure_datetime ? new Date(bill.departure_datetime) : new Date();
  const bookingNights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

  // B2B classes vs B2C classes for badges
  const catClass = isB2B ? 'pill pill-gray' : 'cat-badge';
  const occClass = isB2B ? 'pill pill-blue' : 'occ-badge';

  // Room rows — use per-stay actual nights if checked_in_at/checked_out_at are available
  let rowsHtml = '';
  for (const stay of stays) {
    const stayIn = stay.checked_in_at ? new Date(stay.checked_in_at) : checkInDate;
    const stayOut = stay.checked_out_at ? new Date(stay.checked_out_at) : checkOutDate;
    const stayNights = Math.max(1, Math.ceil((stayOut - stayIn) / (1000 * 60 * 60 * 24)));
    const occ = `${stay.occupancy_type || 'Single'}${stay.extra_bed ? ' + Extra Bed' : ''}`;
    const rate = stay.operational_tariff ? parseFloat(stay.operational_tariff).toFixed(2) : '0.00';
    const amount = (parseFloat(stay.operational_tariff || 0) * stayNights).toFixed(2);
    
    rowsHtml += `
        <tr>
          <td>
            <div style="font-weight:500">${stay.room_number || '-'}</div>
            <div class="muted">${stay.operational_room_type || bill.room_type || '-'}</div>
            <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">Guest: ${stay.guest_name || '-'}</div>
          </td>
          <td><span class="${catClass}">Cat ${bill.category_id || '-'}</span></td>
          <td><span class="${occClass}">${occ}</span></td>
          <td class="r">${stayNights}</td>
          <td class="r">${rate}</td>
          <td class="r">${amount}</td>
        </tr>
    `;
  }

  // Totals Section
  let totalsHtml = `
    <div class="tot-row sub">
      <span>Subtotal (excl. GST)</span>
      <span>₹${subtotal.toFixed(2)}</span>
    </div>
  `;

  if (gstType === 'IGST') {
    totalsHtml += `
    <div class="tot-row gst-line">
      <span>IGST @ ${billJson.gst_rate || 12}% <span class="gst-tag">SAC ${config.sac_code || '996311'}</span></span>
      <span>₹${gstTotal.toFixed(2)}</span>
    </div>
    `;
  } else {
    totalsHtml += `
    <div class="tot-row gst-line">
      <span>CGST @ ${(billJson.gst_rate || 12) / 2}% <span class="gst-tag">SAC ${config.sac_code || '996311'}</span></span>
      <span>₹${halfGst.toFixed(2)}</span>
    </div>
    <div class="tot-row gst-line">
      <span>SGST @ ${(billJson.gst_rate || 12) / 2}% <span class="gst-tag">SAC ${config.sac_code || '996311'}</span></span>
      <span>₹${halfGst.toFixed(2)}</span>
    </div>
    `;
  }

  totalsHtml += `
    <div class="tot-row divider grand">
      <span>Total amount payable</span>
      <span>₹${total.toFixed(2)}</span>
    </div>
  `;

  // Dynamic IGST Note for B2B
  const supplierGstin = config.gstin || '33AAAJN0297K1ZO';
  const supplierStateCode = supplierGstin.substring(0, 2) || '33';
  const supplierStateName = getStateName(supplierStateCode);

  if (isB2B && gstType === 'IGST') {
    const recipientGstin = bill.gstin || '';
    const recipientStateCode = recipientGstin.substring(0, 2) || '33';
    const recipientStateName = getStateName(recipientStateCode);
    totalsHtml += `
    <div class="igst-note">
      <i class="ti ti-info-circle" aria-hidden="true"></i>
      <span>IGST applies because the place of supply (${recipientStateCode} — ${recipientStateName}, as per recipient's registration) differs from the supplier's state (${supplierStateCode} — ${supplierStateName}). CGST + SGST do not apply on inter-state supplies.</span>
    </div>
    `;
  }

  // Invoice identifiers
  const catMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const fallbackFormattedId = bill.booking_seq 
    ? `APP/CAT-${catMap[bill.category_id] || 'NA'}/${String(bill.booking_seq).padStart(4, '0')}`
    : bookingId.split('-')[0].toUpperCase();
  const displayBookingId = bill.formatted_id || fallbackFormattedId;
  const invoiceNo = bill.invoice_number || `INV-${displayBookingId}`;
  
  // Perform placeholder replacements
  // 1. Institution Details
  html = html.replace(/{{INSTITUTION_LEGAL_NAME}}/g, config.legal_name || 'NIT Trichy Guest House');
  html = html.replace(/{{INSTITUTION_ADDRESS}}/g, config.address || 'Tanjore Main Road, NH 67, Tiruchirappalli, Tamil Nadu - 620015');
  html = html.replace(/{{INSTITUTION_GSTIN}}/g, supplierGstin);
  html = html.replace(/{{INSTITUTION_PAN}}/g, config.pan || 'AAAJN0297K');
  html = html.replace(/{{INSTITUTION_SAC_CODE}}/g, config.sac_code || '996311');
  html = html.replace(/{{INSTITUTION_STATE_CODE}}/g, supplierStateCode);

  // 2. Booking Metadata
  html = html.replace(/{{INVOICE_NO}}/g, invoiceNo);
  html = html.replace(/{{INVOICE_DATE}}/g, formatShortDate(bill.generated_at || new Date()));
  html = html.replace(/{{BOOKING_ID}}/g, displayBookingId);
  html = html.replace(/{{CHECK_IN}}/g, formatDate(bill.arrival_datetime));
  html = html.replace(/{{CHECK_OUT}}/g, formatDate(bill.departure_datetime));
  html = html.replace(/{{DURATION_NIGHTS}}/g, `${bookingNights}`);

  // 3. Recipient Details
  if (isB2B) {
    const recipientGstin = bill.gstin || '';
    const recipientStateCode = recipientGstin.substring(0, 2) || '33';
    
    const recipientDetail = `${bill.company_address || ''}`;
    html = html.replace(/{{RECIPIENT_NAME}}/g, bill.company_name || 'Corporate Guest');
    html = html.replace(/{{RECIPIENT_DETAIL}}/g, recipientDetail);
    html = html.replace(/{{RECIPIENT_GSTIN}}/g, bill.gstin || 'N/A');
    
    const supplyTypeText = supplierStateCode === recipientStateCode ? 'intra-state' : 'inter-state';
    html = html.replace(/{{SUPPLY_TYPE_TEXT}}/g, supplyTypeText);
  } else {
    const recipientDetail = `
      ${bill.applicant_email || ''}<br>
      Category: CAT-${bill.category_id || 'N/A'}
    `;
    html = html.replace(/{{RECIPIENT_NAME}}/g, bill.applicant_name || 'Guest');
    html = html.replace(/{{RECIPIENT_DETAIL}}/g, recipientDetail);
  }

  // 4. Room Rows
  html = html.replace(/{{ROOM_ROWS}}/g, rowsHtml);

  // 5. Totals Block
  html = html.replace(/{{TOTALS_SECTION}}/g, totalsHtml);

  // 6. Words
  html = html.replace(/{{AMOUNT_IN_WORDS}}/g, `Amount in words: ${amountInWords(total)}`);

  // 7. Payment details
  const paymentMode = bill.payment_mode || 'PENDING';
  const txnRef = bill.transaction_ref || 'N/A';
  html = html.replace(/{{PAYMENT_MODE}}/g, paymentMode);
  html = html.replace(/{{TRANSACTION_REF}}/g, txnRef);
  html = html.replace(/{{SETTLED_DATE}}/g, formatShortDate(bill.generated_at || new Date()));
  html = html.replace(/{{SETTLED_BY}}/g, `Settled by: ${settledByName}`);

  // 8. Signatory
  html = html.replace(/{{SIGNATORY_NAME}}/g, config.signatory_name || 'Authorized Signatory');
  html = html.replace(/{{SIGNATORY_DESIGNATION}}/g, config.signatory_designation || 'Warden/Coordinator');

  // Strip any tabler icon <i> tags to simple text markers (avoids CDN dependency in PDF)
  html = html.replace(/<i[^>]*class="ti[^"]*"[^>]*aria-hidden="true"[^>]*><\/i>/g, '');

  // Generate PDF via Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
};

exports.saveInvoiceToDisk = async (bookingId) => {
    // Generate the PDF
    const pdfBuffer = await exports.generateGSTInvoice(bookingId);
    
    const invoicesDir = path.join(process.cwd(), 'uploads/invoices');
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
    
    const filePath = path.join(invoicesDir, `${bookingId}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    
    // If invoice_number is not there in db, store it with formatted id
    const dbClient = await db.getClient();
    try {
        const billRes = await dbClient.query(`
            SELECT fb.invoice_number, br.formatted_id, br.category_id, br.booking_seq
            FROM final_bills fb
            JOIN booking_requests br ON fb.booking_id = br.booking_id
            WHERE fb.booking_id = $1`, [bookingId]);
        
        if (billRes.rows.length > 0) {
            const bill = billRes.rows[0];
            if (!bill.invoice_number) {
                const catMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
                const fallbackFormattedId = bill.booking_seq 
                  ? `APP/CAT-${catMap[bill.category_id] || 'NA'}/${String(bill.booking_seq).padStart(4, '0')}`
                  : bookingId.split('-')[0].toUpperCase();
                const displayBookingId = bill.formatted_id || fallbackFormattedId;
                const invoiceNo = `INV-${displayBookingId}`;
                
                await dbClient.query(`UPDATE final_bills SET invoice_number = $1 WHERE booking_id = $2`, [invoiceNo, bookingId]);
            }
        }
    } finally {
        dbClient.release();
    }
    
    return `/uploads/invoices/${bookingId}.pdf`;
};
