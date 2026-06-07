const { getClient, runQuery } = require('../config/database');

exports.getFinalBill = async (bookingId) => {
    const result = await runQuery(null, 'SELECT * FROM final_bills WHERE booking_id = $1', [bookingId]);
    return result.rows[0];
};

exports.overrideFinalBill = async (bookingId, currentBill, newData, reason, adminId) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        
        // Update final_bills
        const updateSql = `
            UPDATE final_bills 
            SET subtotal = $1, gst = $2, total = $3, generated_json = $4
            WHERE booking_id = $5 
            RETURNING *
        `;
        
        // We inject the override notice into the generated_json
        const updatedJson = {
            ...currentBill.generated_json,
            is_overridden: true,
            override_reason: reason,
            override_by: adminId,
            override_at: new Date().toISOString()
        };
        
        const updateParams = [newData.subtotal, newData.gst, newData.total, updatedJson, bookingId];
        const result = await runQuery(client, updateSql, updateParams);
        const newBill = result.rows[0];
        
        // Log to audit_logs
        const auditSql = `
            INSERT INTO audit_logs (user_id, action, target_entity, target_id, old_value, new_value, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const auditParams = [
            adminId,
            'OVERRIDE_BILL',
            'final_bills',
            bookingId,
            currentBill,
            newBill,
            reason
        ];
        await runQuery(client, auditSql, auditParams);
        
        await client.query('COMMIT');
        return newBill;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

exports.getAuditLogs = async (limit = 50, offset = 0) => {
    const sql = `
        SELECT a.log_id, a.action, a.target_id as booking_id, a.old_value, a.new_value, a.remarks, a.created_at, u.full_name as admin_name
        FROM audit_logs a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.target_entity = 'final_bills' AND a.action = 'OVERRIDE_BILL'
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
    `;
    
    const countSql = `SELECT COUNT(*) as total FROM audit_logs WHERE target_entity = 'final_bills' AND action = 'OVERRIDE_BILL'`;
    
    const [result, countResult] = await Promise.all([
        runQuery(null, sql, [limit, offset]),
        runQuery(null, countSql)
    ]);
    
    return {
        rows: result.rows,
        totalCount: parseInt(countResult.rows[0].total, 10)
    };
};
