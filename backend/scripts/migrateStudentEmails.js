const db = require('../src/db/db');

async function migrate() {
    console.log("=== Starting Student Email Migration ===");
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Query all students
        console.log("Fetching student records...");
        const studentsQuery = await client.query(`
            SELECT u.user_id, u.full_name, u.email as personal_email, u.employee_id as roll_number
            FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            JOIN roles r ON ur.role_id = r.role_id
            WHERE r.role_name = 'student' AND u.deleted_at IS NULL
        `);

        const students = studentsQuery.rows;
        console.log(`Found ${students.length} student records.`);

        let successCount = 0;
        let skipCount = 0;
        const auditLogs = [];

        for (const student of students) {
            const rollNumber = student.roll_number ? student.roll_number.trim() : null;
            if (!rollNumber) {
                console.warn(`WARNING: Student ${student.full_name} (ID: ${student.user_id}) has no roll number. Skipping.`);
                auditLogs.push({
                    user_id: student.user_id,
                    name: student.full_name,
                    status: 'SKIPPED',
                    reason: 'No roll number / employee_id'
                });
                skipCount++;
                continue;
            }

            const instituteEmail = `${rollNumber}@nitt.edu`.toLowerCase();
            const personalEmail = student.personal_email;

            // Update email in the users table
            await client.query(`
                UPDATE users
                SET email = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [instituteEmail, student.user_id]);

            auditLogs.push({
                user_id: student.user_id,
                name: student.full_name,
                roll_number: rollNumber,
                old_email: personalEmail,
                new_email: instituteEmail,
                status: 'MIGRATED'
            });
            successCount++;
        }

        await client.query('COMMIT');
        console.log("\n=== Migration Summary ===");
        console.log(`Total students processed: ${students.length}`);
        console.log(`Successfully migrated:    ${successCount}`);
        console.log(`Skipped (missing roll):   ${skipCount}`);
        console.log("=========================");

        // Print detailed audit logs
        console.log("\n--- Detailed Audit Log ---");
        console.log(JSON.stringify(auditLogs, null, 2));

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Migration failed, transaction rolled back:", error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
