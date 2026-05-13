-- schema.sql
-- 1. SAFELY DROP OLD TABLES
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS booking_documents CASCADE;
DROP TABLE IF EXISTS booking_approvals CASCADE;
DROP TABLE IF EXISTS booking_workflow_instances CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflow_definitions CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sponsorship_requests CASCADE;
DROP TABLE IF EXISTS approval_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_proofs CASCADE;
DROP TABLE IF EXISTS payment_warnings CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS booking_rooms CASCADE;
DROP TABLE IF EXISTS guest_food_preferences CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS booking_requests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_tariffs CASCADE;
DROP TABLE IF EXISTS category_rules CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. ENTERPRISE RBAC ARCHITECTURE
-- Roles define a job function or title (e.g., 'HOD', 'Admin').
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions are granular actions a user can perform (e.g., 'approve_booking', 'edit_room').
CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maps permissions to roles.
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User table with soft delete and versioning support.
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    department VARCHAR(100),
    designation VARCHAR(100),
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Assigns roles to users, allowing a user to have multiple roles.
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    payment_modes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ROOM TARIFFS
CREATE TABLE room_tariffs (
    tariff_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES category_rules(category_id),
    room_type VARCHAR(50),
    single_occupancy NUMERIC,
    double_occupancy NUMERIC,
    extra_bed NUMERIC DEFAULT 400,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    current_status VARCHAR(30) DEFAULT 'available' CHECK (current_status IN ('available', 'reserved', 'occupied', 'maintenance', 'cleaning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    booking_state VARCHAR(50) DEFAULT 'PENDING_APPROVER' CHECK (booking_state IN ('DRAFT', 'PENDING_APPROVER', 'APPROVER_APPROVED', 'APPROVER_REJECTED', 'PENDING_ADMIN', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'READY_FOR_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED')),
    payment_state VARCHAR(50) DEFAULT 'PENDING' CHECK (payment_state IN ('NOT_APPLICABLE', 'PENDING', 'PAYMENT_PROOF_SUBMITTED', 'PAYMENT_PROOF_RESUBMITTED', 'UNDER_REVIEW', 'PAID', 'FAILED', 'REJECTED', 'WARNING_1_SENT', 'WARNING_2_SENT', 'WARNING_3_SENT', 'REFUND_INITIATED', 'REFUNDED')),
    sponsor_status VARCHAR(50) DEFAULT 'NOT_REQUIRED' CHECK (sponsor_status IN ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'REJECTED')),
    payment_deadline TIMESTAMP,
    invoice_id UUID,
    payment_responsible VARCHAR(50) CHECK (payment_responsible IN ('guest', 'coordinator', 'department', 'project', 'institute')),
    assigned_approver_id UUID REFERENCES users(user_id),
    version INTEGER NOT NULL DEFAULT 1,
    pending_extension_datetime TIMESTAMP,
    allocated_room_numbers VARCHAR(100),
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 9. FOOD PREFERENCES
CREATE TABLE guest_food_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(guest_id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    breakfast INTEGER DEFAULT 0 CHECK (breakfast >= 0),
    lunch INTEGER DEFAULT 0 CHECK (lunch >= 0),
    dinner INTEGER DEFAULT 0 CHECK (dinner >= 0),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

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
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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

-- 12.5 PAYMENT PROOFS
CREATE TABLE payment_proofs (
    proof_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(user_id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    reviewed_by_user_id UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12.6 PAYMENT WARNINGS
CREATE TABLE payment_warnings (
    warning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    issued_by_user_id UUID NOT NULL REFERENCES users(user_id),
    warning_level INTEGER NOT NULL CHECK (warning_level IN (1, 2, 3)),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. APPROVAL LOGS
CREATE TABLE approval_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. SPONSORSHIP REQUESTS
CREATE TABLE sponsorship_requests (
    sponsor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    sponsor_user_id UUID REFERENCES users(user_id),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 16. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. REFUNDS
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(payment_id),
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    razorpay_refund_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. DYNAMIC WORKFLOW ENGINE
CREATE TABLE workflow_definitions (
    workflow_id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_steps (
    step_id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(workflow_id),
    step_order INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    approver_role_id INTEGER NOT NULL REFERENCES roles(role_id),
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workflow_id, step_order)
);

CREATE TABLE booking_workflow_instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(workflow_id),
    current_step_id INTEGER REFERENCES workflow_steps(step_id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id)
);

CREATE TABLE booking_approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES booking_workflow_instances(instance_id) ON DELETE CASCADE,
    step_id INTEGER NOT NULL REFERENCES workflow_steps(step_id),
    approver_user_id UUID NOT NULL REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'COMMENTED')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. BOOKING DOCUMENTS
CREATE TABLE booking_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES booking_requests(booking_id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(user_id),
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 20. AUDIT LOGS
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(255) NOT NULL,
    target_entity VARCHAR(100),
    target_id TEXT,
    old_value JSONB,
    new_value JSONB,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. INDEXING STRATEGY
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_bookings_user_id ON booking_requests(user_id);
CREATE INDEX idx_bookings_state ON booking_requests(booking_state);
CREATE INDEX idx_bookings_category_id ON booking_requests(category_id);
CREATE INDEX idx_bookings_assigned_approver ON booking_requests(assigned_approver_id);
CREATE INDEX idx_bookings_arrival ON booking_requests(arrival_datetime);
CREATE INDEX idx_bookings_departure ON booking_requests(departure_datetime);

CREATE INDEX idx_guests_booking_id ON guests(booking_id);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);

CREATE INDEX idx_guest_food_meal_date ON guest_food_preferences(meal_date);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

CREATE INDEX idx_booking_rooms_room_id ON booking_rooms(room_id);
CREATE INDEX idx_booking_rooms_allocated_from ON booking_rooms(allocated_from);
CREATE INDEX idx_booking_rooms_allocated_to ON booking_rooms(allocated_to);

CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_approval_logs_booking_id ON approval_logs(booking_id);
CREATE INDEX idx_approval_logs_approver_id ON approval_logs(approver_id);

CREATE INDEX idx_workflow_instances_booking_id ON booking_workflow_instances(booking_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_entity, target_id);