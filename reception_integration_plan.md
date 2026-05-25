# Decoupled Reception Module Integration Plan & Contract Spec

This document details the architectural blueprint, database contracts, and REST API specification for integrating a decoupled **Reception / Front Desk Module** with the core **Guest House Management System**.

Since the reception interface has been moved to a separate repository/folder to be managed as an independent module, this document outlines the two primary integration strategies to ensure both systems communicate securely and maintain data consistency.

---

## 1. System Architecture Overview

The core Guest House App is the **Source of Truth** for user profiles, approval workflows, room inventory, initial bookings, and pre-stay payments. The Reception Module is a specialized console for front desk operations (managing actual arrivals, room keys, check-in timestamps, stay extensions, and room cleaning statuses).

```mermaid
flowchart TD
    A[Guest/Applicant] -->|Submit Booking| B(Core Guest House App)
    B -->|Workflow Approvals HOD/Dean/Director| B
    B -->|Admin Verification & Payment| B
    B -->|State: READY_FOR_CHECKIN| C[(Shared PostgreSQL Database)]
    
    subgraph Reception Module
        D[Reception Staff Console]
        D -->|Allocate Rooms & Check-In| E(Stay Tracker)
        D -->|Checkout Guest & Calculate Bill| F(Billing Snapshot Engine)
        D -->|Mark Rooms for Cleaning| G(Room Status Manager)
    end

    E <-->|Sync Stays / Tables| C
    F <-->|Write Final Bills| C
    G <-->|Update Room State| C
```

---

## 2. Shared Database Model (Direct Integration)
*Recommended for environments where both services run in the same network or campus environment.*

In this model, the Reception Module connects directly to the core PostgreSQL database using a dedicated database user (e.g. `reception_service_user`) with restricted table permissions.

### 2.1 Core DB Tables Required by Reception

| Table Name | Operations | Purpose |
| :--- | :--- | :--- |
| `booking_requests` | `SELECT`, `UPDATE` | Reading approved bookings; updating state to `CHECKED_IN` or `CHECKED_OUT`; updating room numbers and stay timestamps. |
| `guests` | `SELECT`, `UPDATE` | Reading guest profiles for check-in; updating guest-level arrival/departure times. |
| `rooms` | `SELECT`, `UPDATE` | Checking current status (`available`, `occupied`, `cleaning`, `maintenance`); updating status on check-in/checkout. |
| `room_tariffs` | `SELECT` | Reading base room costs per guest category. |
| `guest_room_stays` | `SELECT`, `INSERT`, `UPDATE` | Storing active occupancy records for individual guests. |
| `occupancy_history` | `INSERT` | Storing day-by-day guest occupancy records for audit trails. |
| `room_status_history`| `INSERT` | Recording transitions between available, cleaning, and occupied states. |
| `final_bills` | `SELECT`, `INSERT` | Saving JSON breakdowns and subtotal details on checkout. |
| `billing_override_logs` | `SELECT`, `INSERT` | Logging billing adjustments overridden by administrators. |

### 2.2 Key State Transitions

1. **Check-In Readiness**: The Reception Module must only allow check-ins for bookings where `booking_requests.booking_state` is either `ADMIN_APPROVED` or `READY_FOR_CHECKIN`.
2. **Check-In Execution**:
   - Set `booking_state` to `CHECKED_IN` and write check-in timestamp `checked_in_at = CURRENT_TIMESTAMP`.
   - Update target `rooms.current_status` to `occupied` and log to `room_status_history`.
   - Write new rows to `guest_room_stays` for each checked-in guest (status `CHECKED_IN`).
3. **Checkout Execution**:
   - Read active stays from `guest_room_stays`.
   - Update `guest_room_stays.stay_status` to `CHECKED_OUT`.
   - Generate a daily breakdown of occupancy cost, inserting it into `occupancy_history`.
   - Change `rooms.current_status` to `cleaning` and log to `room_status_history`.
   - Save the bill snapshot to `final_bills` and update `booking_requests.booking_state` to `CHECKED_OUT`.

> [!WARNING]
> **PostgreSQL Overlapping Room Constraint**
> The `booking_rooms` table enforces an exclusion constraint (`prevent_overlapping_rooms EXCLUDE USING gist (room_id WITH =, tsrange(allocated_from, allocated_to) WITH &&)`) to prevent double-bookings. Any room allocation script written for the Reception Module must verify that the room is marked `available` and does not overlap existing active reservations.

---

## 3. Secure REST API Model (Service-to-Service Integration)
*Recommended for decoupled microservices, cloud deployments, or separate hosting environments.*

In this model, the Core Guest House backend acts as an API Gateway, exposing endpoints protected by a shared secret API Key or service token.

### 3.1 Security Configurations
Add the following key to your `.env` configuration file on the core server:
```env
RECEPTION_API_KEY=your_secure_random_hex_key_here
```

The Reception Module must attach this key to all HTTP requests:
```http
Authorization: Bearer your_secure_random_hex_key_here
```

### 3.2 Endpoint Specifications

#### 📋 1. Fetch Today's Arrivals
* **Route**: `GET /api/external/reception/arrivals`
* **Headers**: `Authorization: Bearer <API_KEY>`
* **Description**: Returns today's expected arrivals, active check-ins, and pending stay extensions.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Today arrivals retrieved successfully",
  "data": [
    {
      "booking_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "booking_state": "ADMIN_APPROVED",
      "arrival_datetime": "2026-05-21T12:00:00Z",
      "departure_datetime": "2026-05-23T11:00:00Z",
      "rooms_required": 1,
      "room_type": "Standard Room",
      "payment_state": "PAID",
      "applicant_name": "Prof. R. Ananthakrishnan",
      "guest_names": "Dr. S. Vignesh, Mrs. V. Vignesh",
      "allocated_room_numbers": null
    }
  ]
}
```

#### 🔑 2. Guest Check-In
* **Route**: `POST /api/external/reception/:bookingId/check-in`
* **Headers**: `Authorization: Bearer <API_KEY>`
* **Payload**:
```json
{
  "allocated_room_numbers": "101, 102",
  "overrideNow": null
}
```
* **Description**: Assigns rooms to the booking, maps guests to individual stays, locks the rooms, and updates the booking state to `CHECKED_IN`.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Guest checked in successfully",
  "data": {
    "booking_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "booking_state": "CHECKED_IN",
    "checked_in_at": "2026-05-21T14:10:00.000Z",
    "allocated_room_numbers": "101, 102"
  }
}
```

#### 🚪 3. Guest Checkout (Dynamic Billing Calc)
* **Route**: `POST /api/external/reception/:bookingId/check-out`
* **Headers**: `Authorization: Bearer <API_KEY>`
* **Description**: Closes all active stays for the booking, dynamically calculates the stay cost, saves the final invoice snapshot to `final_bills`, sets the rooms to `cleaning`, and marks the booking state as `CHECKED_OUT`.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Guest checked out successfully",
  "data": {
    "booking_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "booking_state": "CHECKED_OUT",
    "checked_out_at": "2026-05-23T10:45:00.000Z",
    "total_estimated_amount": 1680.00
  }
}
```

#### 🔄 4. Room Transfer / Swap
* **Route**: `POST /api/external/reception/rooms/transfer`
* **Payload**:
```json
{
  "stayId": "7a35fe52-78d1-4475-b6d3-2f22bbf501ab",
  "newRoomNumber": "104",
  "remarks": "Guest complained about AC in room 101"
}
```
* **Description**: Transfers an active guest to a different vacant room, logs occupancy history for the previous room up to this timestamp, and initializes a new stay record for room 104.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Room transfer completed successfully"
}
```

---

## 4. Setup Guide (Step-by-Step)

If you are ready to implement the **REST API Gateway** on the core backend, follow these steps:

### Step 1: Create the External Route Handler
Create a file at `backend/src/routes/external.routes.js` and paste the following scaffolding:

```javascript
const express = require('express');
const router = express.Router();
const receptionController = require('../controllers/reception.controller');

// Middleware to verify the Shared Secret API key
const verifyExternalApiKey = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid credentials' });
    }
    const token = authHeader.split(' ')[1];
    const expectedKey = process.env.RECEPTION_API_KEY;
    
    if (!expectedKey || token !== expectedKey) {
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid API key' });
    }
    next();
};

// Protect all external reception endpoints
router.use(verifyExternalApiKey);

// Mount mapped controllers from the restored files
router.get('/arrivals', receptionController.getTodayArrivals);
router.get('/rooms', receptionController.getRoomsWithStays);
router.post('/rooms/:roomNumber/status', receptionController.updateRoomStatus);
router.post('/rooms/transfer', receptionController.roomTransfer);
router.post('/rooms/override', receptionController.overrideStayBilling);
router.post('/bookings/:bookingId/extend', receptionController.extendStay);
router.post('/bookings/:id/check-in', receptionController.checkIn);
router.post('/bookings/:id/check-out', receptionController.checkOut);

module.exports = router;
```

### Step 2: Register the Routes on the Main App
In `backend/src/routes/index.js`, mount the newly created routes under `/api/external/reception`:

```diff
 const approvalRoutes = require('./approval.routes');
 const paymentRoutes = require('./payment.routes');
+const externalRoutes = require('./external.routes');
 
 // central mount
 safeMount('/auth', authRoutes);
 safeMount('/bookings', bookingRoutes);
 safeMount('/approvals', approvalRoutes);
 safeMount('/payments', paymentRoutes);
+safeMount('/external/reception', externalRoutes);
```

### Step 3: Configure Env File
Add the `RECEPTION_API_KEY` configuration to the `.env` file on both the core app and the external reception module so they match:
```bash
RECEPTION_API_KEY="1d8892f3ac2e783ffae8a0e88cf8cf3d"
```

---

## 5. Verification checklist
When testing the integration of the external module, verify the following:
* [ ] **Auth block**: Verify requests without the `Authorization: Bearer ...` header return `401 Unauthorized`.
* [ ] **Wrong token block**: Verify requests with an incorrect token return `403 Forbidden`.
* [ ] **Double allocation guard**: Verify checking-in a room already occupied (status `occupied` in `rooms`) throws a validation error.
* [ ] **Checkout billing snapshot**: Verify that after checkout, a record with total stays is successfully generated in the `final_bills` table, and the booking state changes to `CHECKED_OUT`.
* [ ] **Super Admin Dashboard validation**: Verify that checked-out bookings immediately appear in the Super Admin's "Final Bills" tab in the Guest House UI.
