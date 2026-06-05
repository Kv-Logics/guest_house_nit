# Reception Override & Individual Guest Stay Management System

This document specifies the technical architecture, database constraints, REST API additions, and frontend visual states for the decoupled **FrontDesk Reception Engine**.

---

## 1. Core Architectural Pillars

### A. Pre-Arrival Room Assignment & Booking-Level Blocking
Instead of assigning rooms only at the moment of checking in the entire booking, receptionists can assign physical rooms to the booking request ahead of time.
- **Table used**: `booking_rooms` (acts as the source of truth for future room reservations).
- **Date range**: `[arrival_datetime, departure_datetime]` of the booking request.
- **Blocking Mechanism**:
  1. Room is validated for overlaps in `booking_rooms` and active stays in `guest_room_stays` for the booking's date range.
  2. Records are inserted into `booking_rooms` with state `'reserved'`.
  3. `booking_requests.allocated_room_numbers` is updated with a comma-separated list of the assigned rooms (matching the logical room slots sequentially).

### B. Individual Guest Check-In Flow
Guests belonging to the same booking can arrive at different times/days. Check-in is handled at the guest level:
- **Button location**: Next to each guest in the arrivals panel or the room matrix details (if the booking has room numbers pre-allocated).
- **Database Action**:
  1. Creates a row in `guest_room_stays` with `checked_in_at = CURRENT_TIMESTAMP` (or mock time machine date).
  2. Validates that the guest is not already checked in.
  3. Transitions target room status to `'occupied'`.
  4. Transitions `booking_requests.booking_state` to `'CHECKED_IN'` (if it was `'READY_FOR_CHECKIN'` or `'ADMIN_APPROVED'`).

### C. Visual Late Checkout Warnings
We need to flag rooms and guests who are staying past their scheduled check-out time.
- **Criteria**: Guest is `CHECKED_IN` and `CURRENT_TIMESTAMP` > `guest.departure_datetime` (or `booking.departure_datetime`).
- **UI Indicators**:
  1. **Room Matrix**: A red dot inside the room box/card.
  2. **Active Registry Table**: A red side stripe/dot in the row of the specific late guest.

### D. Single vs. Group Room Transfer Rules
- **Rule 1 (Single Guest)**: Allowed only if they are the *sole active guest* in that room (either checked in alone or another guest has already checked out).
- **Rule 2 (Group Transfer)**: If multiple active guests reside in the room, individual transfer is blocked. They must be transferred *together as a group* to the new room.

---

## 2. API Contract Specification

### 📋 1. Assign Rooms in Advance (Block Rooms)
* **Route**: `POST /api/reception/bookings/:id/assign-rooms`
* **Payload**:
```json
{
  "allocated_room_numbers": "101, 102"
}
```
* **Behavior**: Clears previous `booking_rooms` for this booking, validates availability of rooms for the booking stay period, inserts blockings, and updates `allocated_room_numbers` in `booking_requests`.

### 🔑 2. Individual Guest Check-In
* **Route**: `POST /api/reception/guests/:guestId/check-in`
* **Payload**: `none`
* **Behavior**: Identifies physical room from the booking's pre-assigned rooms (based on `room_index`), creates stay in `guest_room_stays`, updates room status to `occupied`, and updates booking state to `CHECKED_IN`.

### 🔄 3. Room Transfer / Swap (Single & Group Support)
* **Route**: `POST /api/reception/rooms/transfer`
* **Payload**:
```json
{
  "stayId": "7a35fe52-78d1-4475-b6d3-2f22bbf501ab",
  "newRoomNumber": "104",
  "remarks": "AC issue",
  "isGroup": false
}
```
* **Behavior**:
  - If `isGroup = true`: Fetches all active stays in the current room, closes them, and creates corresponding stays in the new room.
  - If `isGroup = false` (or not passed): Verifies only 1 active stay exists in the room, closes it, and moves it to the new room.

---

## 3. Database Integrity & Check-In Validation
```sql
-- Checking room availability for booking dates [arrival_datetime, departure_datetime]
SELECT 1 FROM booking_rooms
WHERE room_id = $1
  AND booking_id != $2
  AND tsrange(allocated_from, allocated_to) && tsrange($3, $4);
```
