const invoiceService = require('./invoice.service');
const receptionRepo = require('../repositories/reception.repository');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/billing/invoice/:bookingId
 * Streams the stored PDF or generates on-demand if not stored.
 */
exports.downloadInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = require('../db/db');
    const bookingRes = await db.query('SELECT user_id, booking_state FROM booking_requests WHERE booking_id = $1', [bookingId]);
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });

    // Allow any authenticated logged-in user to access the checkout invoice
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please login.' });
    }

    const bookingState = bookingRes.rows[0].booking_state;
    
    let existingBill = await receptionRepo.getFinalBillByBooking(bookingId);
    
    // If the booking is currently CHECKED_IN (i.e. stay might have been extended or shortened),
    // dynamically recalculate and update the bill snapshot before generating the PDF.
    if (bookingState === 'CHECKED_IN') {
        const receptionService = require('../services/reception.service');
        const client = await db.getClient();
        try {
            const billing = await receptionService.calculateBookingBilling(bookingId, client);
            await receptionRepo.insertFinalBill({
                booking_id: bookingId,
                generated_json: billing.breakdown,
                subtotal: billing.subtotal,
                gst: billing.gst,
                total: billing.total,
                billing_type: existingBill?.billing_type || 'B2C',
                company_name: existingBill?.company_name || null,
                gstin: existingBill?.gstin || null,
                company_address: existingBill?.company_address || null,
                generated_by: req.user.user_id
            }, client);
            existingBill = await receptionRepo.getFinalBillByBooking(bookingId, client);
        } catch (e) {
            console.error('[Invoice] Dynamic pre-calc failed:', e.message);
        } finally {
            client.release();
        }
    }

    let bill = existingBill;
    if (!bill) {
        const receptionService = require('../services/reception.service');
        const client = await db.getClient();
        try {
            const billing = await receptionService.calculateBookingBilling(bookingId, client);
            await receptionRepo.insertFinalBill({
                booking_id: bookingId,
                generated_json: billing.breakdown,
                subtotal: billing.subtotal,
                gst: billing.gst,
                total: billing.total,
                billing_type: 'B2C',
                company_name: null,
                gstin: null,
                company_address: null,
                generated_by: req.user.user_id
            }, client);
            bill = await receptionRepo.getFinalBillByBooking(bookingId, client);
        } catch (e) {
            console.error('[Invoice] Dynamic fallback pre-calc failed:', e.message);
        } finally {
            client.release();
        }
    }

    if (!bill) {
      return res.status(404).json({ error: 'Invoice not found or cannot be generated yet.' });
    }

    const invoicesDir = path.join(process.cwd(), 'uploads/invoices');
    const filePath = path.join(invoicesDir, `${bookingId}.pdf`);

    // Fetch config to check the always_regenerate_invoices toggle
    const configRes = await db.query('SELECT always_regenerate_invoices FROM institution_configs WHERE config_id = 1');
    const forceRegenerate = configRes.rows.length > 0 && configRes.rows[0].always_regenerate_invoices !== false;

    // Determine if we need to generate or regenerate the PDF
    let shouldGenerate = true;
    if (!forceRegenerate && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        // If the file is newer than or equal to the bill's generated timestamp, we don't need to regenerate.
        if (new Date(stats.mtime).getTime() >= new Date(bill.generated_at).getTime()) {
            shouldGenerate = false;
        }
    }

    if (shouldGenerate) {
        await invoiceService.saveInvoiceToDisk(bookingId);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${bill.invoice_number ? bill.invoice_number.replace(/\//g, '_') : bookingId}.pdf"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('[Invoice] Download failed:', err);
    res.status(500).json({ error: 'Failed to generate invoice.' });
  }
};
