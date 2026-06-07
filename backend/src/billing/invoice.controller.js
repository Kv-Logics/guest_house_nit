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
