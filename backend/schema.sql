-- schema.sql
-- 1. SAFELY DROP OLD TABLES
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sponsorship_requests CASCADE;
DROP TABLE IF EXISTS approval_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS booking_rooms CASCADE;
DROP TABLE IF EXISTS guest_food_preferences CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS booking_requests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_tariff CASCADE;
DROP TABLE IF EXISTS category_rules CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. ENTERPRISE RBAC ARCHITECTURE
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CATEGORY ENGINE
CREATE TABLE category_rules (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    allowed_applicant_roles TEXT[] NOT NULL,
    requires_project_code BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    requires_payment_before_checkout BOOLEAN DEFAULT false,
    max_rooms_allowed INTEGER NOT NULL,
    max_guest_count INTEGER NOT NULL,
    visit_type VARCHAR(30) CHECK (visit_type IN ('official', 'personal', 'both')),
    approval_hierarchy VARCHAR(50) DEFAULT 'faculty',
    payment_modes TEXT[]
);

-- 5. ROOM TARIFFS
CREATE TABLE room_tariff (
    tariff_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES category_rules(category_id),
    room_type VARCHAR(50),
    single_occupancy NUMERIC,
    double_occupancy NUMERIC,
    extra_bed NUMERIC DEFAULT 400
);

-- 6. ROOMS
CREATE TABLE rooms (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    block_name VARCHAR(50),
    floor_number INTEGER,
    room_type VARCHAR(30) CHECK (room_type IN ('single', 'double', 'suite')),
    capacity INTEGER NOT NULL,
    category_id INTEGER REFERENCES category_rules(category_id),
    has_ac BOOLEAN DEFAULT true,
    current_status VARCHAR(30) DEFAULT 'available' CHECK (current_status IN ('available', 'reserved', 'occupied', 'maintenance', 'cleaning'))
);

-- 7. BOOKING REQUESTS (Updated with Payment Calculations)
CREATE TABLE booking_requests (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    category_id INTEGER REFERENCES category_rules(category_id),
    purpose_of_visit TEXT NOT NULL,
    visit_type VARCHAR(30) CHECK (visit_type IN ('official', 'personal')),
    project_code VARCHAR(100),
    arrival_datetime TIMESTAMP NOT NULL,
    departure_datetime TIMESTAMP NOT NULL,
    rooms_required INTEGER NOT NULL CHECK (rooms_required > 0),
    room_type VARCHAR(50) DEFAULT 'Standard Room',
    extra_beds INTEGER DEFAULT 0,
    total_estimated_amount NUMERIC DEFAULT 0,
    undertaking_accepted BOOLEAN NOT NULL,
    booking_state VARCHAR(50) DEFAULT 'PENDING_APPROVAL' CHECK (booking_state IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'INSTITUTE_BILLED', 'SPONSORED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REFUNDED', 'REJECTED')),
    payment_state VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_state IN ('NOT_REQUIRED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'SPONSORED', 'INSTITUTE_BILLED')),
    approval_state VARCHAR(50) DEFAULT 'PENDING_HOD' CHECK (approval_state IN ('NOT_REQUIRED', 'PENDING_HOD', 'PENDING_DEAN', 'PENDING_REGISTRAR', 'APPROVED', 'REJECTED')),
    sponsor_status VARCHAR(50) DEFAULT 'NOT_REQUIRED' CHECK (sponsor_status IN ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'REJECTED')),
    payment_deadline TIMESTAMP,
    invoice_id UUID,
    payment_responsible VARCHAR(50) CHECK (payment_responsible IN ('guest', 'coordinator', 'department', 'project', 'institute')),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_dates CHECK (departure_datetime > arrival_datetime),
    CONSTRAINT chk_undertaking CHECK (undertaking_accepted = true)
);

-- 8. MULTI-GUEST SYSTEM
CREATE TABLE guests (
    guest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    guest_name VARCHAR(120) NOT NULL,
    designation VARCHAR(100),
    relation_to_applicant VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(120),
    gender VARCHAR(20),
    age INTEGER,
    address TEXT,
    identity_proof_type VARCHAR(50),
    identity_proof_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. FOOD PREFERENCES
CREATE TABLE guest_food_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(guest_id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    breakfast INTEGER DEFAULT 0 CHECK (breakfast >= 0),
    lunch INTEGER DEFAULT 0 CHECK (lunch >= 0),
    dinner INTEGER DEFAULT 0 CHECK (dinner >= 0),
    remarks TEXT
);

-- 10. ROOM ALLOCATION
CREATE TABLE booking_rooms (
    booking_room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id),
    room_id UUID REFERENCES rooms(room_id),
    allocated_from TIMESTAMP NOT NULL,
    allocated_to TIMESTAMP NOT NULL,
    allocation_status VARCHAR(30) DEFAULT 'reserved',
    allocated_by VARCHAR(120),

    CONSTRAINT prevent_overlapping_rooms EXCLUDE USING gist (
        room_id WITH =,
        tsrange(allocated_from, allocated_to) WITH &&
    )
);

-- 11. INVOICES
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'UNPAID',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP
);

-- 12. PAYMENTS
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(invoice_id),
    amount NUMERIC NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. PAYMENT TRANSACTIONS
CREATE TABLE payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(payment_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. APPROVAL LOGS
CREATE TABLE approval_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SPONSORSHIP REQUESTS
CREATE TABLE sponsorship_requests (
    sponsor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    sponsor_user_id UUID REFERENCES users(user_id),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 16. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. REFUNDS
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(payment_id),
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    razorpay_refund_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);