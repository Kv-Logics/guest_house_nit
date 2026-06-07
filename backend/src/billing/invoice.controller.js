const invoiceService = require('./invoice.service');
const receptionRepo = require('../repositories/reception.repository');

/**
 * GET /api/billing/invoice/:bookingId
 * Streams the stored PDF or generates on-demand if not stored.
 */
exports.downloadInvoice = async (req, res) => {
  const { bookingId } = req.params;
  try {
    const bill = await receptionRepo.getFinalBillByBooking(bookingId);
    if (!bill) {
      return res.status(404).json({ error: 'Invoice not found for this booking.' });
    }
    const { db } = require('../config/database');
    const bookingRes = await db.query('SELECT user_id FROM booking_requests WHERE booking_id = $1', [bookingId]);
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    const bookingOwner = bookingRes.rows[0].user_id;

    if (req.user.role === 'user' && bookingOwner !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this invoice.' });
    }

    if (bill.payment_mode === null) {
      return res.status(400).json({ error: 'Payment not yet confirmed. Invoice unavailable.' });
    }

    // Generate PDF on the fly
    const pdfBuffer = await invoiceService.generateGSTInvoice(bookingId, null);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 
      `attachment; filename="invoice-${bill.invoice_number ? bill.invoice_number.replace(/\//g, '_') : bookingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[Invoice] Download failed:', err);
    res.status(500).json({ error: 'Failed to generate invoice.' });
  }
};
