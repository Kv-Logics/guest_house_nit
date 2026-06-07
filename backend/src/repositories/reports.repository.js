const { runQuery } = require('../config/database');

exports.getMonthlyRevenue = async (targetDate) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // 1-indexed for postgres

    const sql = `
        SELECT 
            COALESCE(fb.payment_mode, 'Online') as payment_mode,
            COUNT(*) as invoice_count,
            SUM(fb.subtotal) as total_subtotal,
            SUM(fb.gst) as total_gst,
            SUM(fb.total) as total_amount
        FROM booking_requests br
        JOIN final_bills fb ON br.booking_id = fb.booking_id
        WHERE br.payment_state = 'PAID'
          AND EXTRACT(YEAR FROM br.updated_at) = $1
          AND EXTRACT(MONTH FROM br.updated_at) = $2
        GROUP BY fb.payment_mode
    `;
    
    const result = await runQuery(null, sql, [year, month]);
    
    // Process results to add CGST/SGST breakdown (assuming equal split of total GST)
    const processed = result.rows.map(row => {
        const gst = parseFloat(row.total_gst || 0);
        return {
            ...row,
            cgst: (gst / 2).toFixed(2),
            sgst: (gst / 2).toFixed(2),
            igst: "0.00" // Defaulting to intra-state for simplicity unless specified
        };
    });

    return processed;
};
