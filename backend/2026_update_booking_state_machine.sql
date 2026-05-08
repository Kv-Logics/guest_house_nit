-- Update the booking_requests state machine constraint
ALTER TABLE booking_requests DROP CONSTRAINT IF EXISTS booking_requests_booking_state_check;

ALTER TABLE booking_requests ADD CONSTRAINT booking_requests_booking_state_check
CHECK (booking_state IN (
    'DRAFT',
    'PENDING_APPROVER',
    'APPROVER_APPROVED',
    'APPROVER_REJECTED',
    'PENDING_ADMIN',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'READY_FOR_CHECKIN',
    'CHECKED_IN',
    'CHECKED_OUT',
    'NO_SHOW',
    'CANCELLED'
));