const db = require('../db/db');

exports.findUserByEmail = async (email) => {
    // Parameterized query to prevent SQL Injection
    const query = `
        SELECT u.*, r.role_name as role 
        FROM users u 
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id 
        LEFT JOIN roles r ON ur.role_id = r.role_id 
        WHERE u.email = $1
    `;
    const result = await db.query(query, [email]);
    return result.rows[0];
};

exports.findUserById = async (id) => {
    // Parameterized query by Primary Key
    const query = `
        SELECT u.user_id, u.full_name, u.email, r.role_name as role, u.department, u.designation 
        FROM users u 
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id 
        LEFT JOIN roles r ON ur.role_id = r.role_id 
        WHERE u.user_id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
};