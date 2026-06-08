const invoiceService = require('./src/billing/invoice.service');

async function test() {
  const bookingId = '927bdb51-2d11-4131-97c7-9ff2f56d6ce0';
  console.log('Testing invoice generation for booking:', bookingId);
  try {
    const pdfBuffer = await invoiceService.generateGSTInvoice(bookingId);
    console.log('Success! PDF buffer length:', pdfBuffer.length);
  } catch (err) {
    console.error('Invoice generation failed:', err);
  }
}

test();
