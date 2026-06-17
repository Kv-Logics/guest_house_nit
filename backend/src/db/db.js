const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'guesthouse_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    // If DATABASE_URL is explicitly set in the future, it will override the above configs
    ...(process.env.DATABASE_URL && { connectionString: process.env.DATABASE_URL })
});

// Run automatic schema migrations/heal checks on startup
const runMigrations = async () => {
    try {
        console.log('Running automatic schema check and migration...');
        await pool.query(`
            -- Ensure expected_departure exists on guests table
            ALTER TABLE guests ADD COLUMN IF NOT EXISTS expected_departure TIMESTAMP WITH TIME ZONE;

            -- Ensure stay_extension_requests table exists
            CREATE TABLE IF NOT EXISTS stay_extension_requests (
                extension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
                guest_id UUID NOT NULL REFERENCES guests(guest_id) ON DELETE CASCADE,
                requested_departure TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT stay_extension_requests_status_check CHECK (status IN ('PENDING', 'PENDING_AUTHORITY', 'PENDING_ADMIN', 'APPROVED', 'REJECTED'))
            );
            ALTER TABLE stay_extension_requests ADD COLUMN IF NOT EXISTS is_allocated BOOLEAN DEFAULT false;
            CREATE INDEX IF NOT EXISTS idx_ext_requests_booking_status ON stay_extension_requests(booking_id, status);

            -- Ensure bulk booking columns exist in booking_requests
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'NORMAL';
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS bulk_booking_reference VARCHAR(100);
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS bulk_booking_metadata JSONB;
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS stay_locked_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS stay_locked_by UUID REFERENCES users(user_id);
            ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20);

            -- Create table for bulk stay records
            CREATE TABLE IF NOT EXISTS bulk_stay_records (
                record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
                guest_name VARCHAR(200) NOT NULL,
                room_number VARCHAR(20) NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                occupancy_type VARCHAR(20) DEFAULT 'single',
                extra_bed BOOLEAN DEFAULT false,
                tariff_per_night NUMERIC,
                total_amount NUMERIC,
                nights INTEGER,
                remarks TEXT,
                bill_group_label VARCHAR(50),
                created_by UUID REFERENCES users(user_id),
                is_locked BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Create table for bulk bill groups
            CREATE TABLE IF NOT EXISTS bulk_bill_groups (
                group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
                group_label VARCHAR(50) NOT NULL,
                group_name VARCHAR(255),
                subtotal NUMERIC,
                gst NUMERIC,
                total NUMERIC,
                invoice_number VARCHAR(100),
                is_locked BOOLEAN DEFAULT false,
                created_by UUID REFERENCES users(user_id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (booking_id, group_label)
            );

            
            -- Drop unique constraint on booking_id in final_bills to allow multiple bills per bulk booking
            ALTER TABLE final_bills DROP CONSTRAINT IF EXISTS final_bills_booking_id_key;

            -- Ensure sequence_tracker table exists
            CREATE TABLE IF NOT EXISTS sequence_tracker (
                id SERIAL PRIMARY KEY,
                financial_year VARCHAR(20) UNIQUE NOT NULL,
                last_sequence INTEGER NOT NULL DEFAULT 0
            );

            -- Ensure bulk booking sequence exists
            CREATE SEQUENCE IF NOT EXISTS bulk_booking_seq START WITH 1;

            -- Ensure block_name classifications are correct for Marudham and Kurinji guest houses
            UPDATE rooms SET block_name = 'Marudham GH' WHERE room_number IN ('41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', 'B2');
            UPDATE rooms SET block_name = 'Kurinji GH' WHERE room_number IN ('11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', 'F1', 'F2', 'F3', 'A1', 'A2', 'B1');
        `);
        console.log('Automatic schema check completed successfully.');
    } catch (err) {
        console.error('Error running automatic schema migration:', err);
    }
};

runMigrations();

// Prevent idle client crashes from bringing down the whole Node.js process
pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool
};