# Overlap Logic & Room Transfer Overhaul Plan (2026-06-11)

This plan addresses room availability logic changes to allow same-day turnaround based on exact check-out/check-in times (not calendar days) without affecting the billing logic. It also fixes room transfer date inconsistencies and expands booking lifecycle logging.

## Proposed Changes

### 1. Room Transfer Allocation Updates
- **Old Allocation Truncation:** Modified `roomTransfer` and `executeRoomTransfer` inside `reception.service.js` to cut short the old room's allocation in `booking_rooms` immediately to the transfer timestamp.
- **New Room Allocation:** Dynamically inserts a new `booking_rooms` record for the target room starting from the transfer timestamp until checkout.
- **Syncing Booking Request:** Updates the `allocated_room_numbers` string inside `booking_requests` immediately to reflect the new set of active rooms.

### 2. Detailed Chronological Lifecycle tracking
- **Combined History API:** Refactored `getBookingHistory` in `booking.service.js` to retrieve both `approval_logs` and `audit_logs` (allocations, transfers, extensions) in a single unified, chronological timeline.
- **Visual Enhancement:** Added style rules to `getActionStyle` inside `BookingDetailsModal.jsx` to render events (`ROOM_ALLOCATED`, `ROOM_TRANSFER`, `STAY_EXTENDED`) with beautiful, cohesive, theme-based status chips.
- **Guest Identity Details:** Embedded `identity_proof_type` and `identity_proof_number` directly inside each guest card within `BookingDetailsModal.jsx` to unify applicant and guest verification flows.

## Verification & Testing
- Checked that room transfers immediately free up the source room in `booking_rooms` and correctly reserve the target room.
- Verified that the detailed chronological timeline merges both approval and audit logs.
- Checked that the guest search preview displays the identity proof details correctly.
