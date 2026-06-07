# Universal Formatted Booking ID Implementation

This plan details the changes required to generate the `formatted_id` (e.g., `NITTGH/25-26/CAT-I/00001`) immediately when a user submits an application. It integrates dynamic `financial_year` configuration via the GHC System Config, and removes all legacy short-hash and admin-generation logic.

## Proposed Changes

### 1. Database Schema
#### [MODIFY] Database / SQL
- Add a new column to the `institution_configs` table: `ALTER TABLE institution_configs ADD COLUMN IF NOT EXISTS financial_year VARCHAR(10) DEFAULT '25-26';`

### 2. Backend Config & Routing
#### [MODIFY] `backend/src/repositories/reception.repository.js`
- Update the `updateInstitutionConfig` query to accept and save `financial_year`.

#### [MODIFY] `backend/src/routes/reception.routes.js`
- Currently, `POST /institution-config` is likely protected by `isAdmin`. I will ensure that the GHC role has full rights to update this configuration without any 403 Forbidden errors.

### 3. Booking Creation Logic
#### [MODIFY] `backend/src/services/booking.service.js`
- **Creation Phase (`createBookingRequest`)**
  - Query `institution_configs` to fetch the dynamically set `financial_year`.
  - Remove the legacy short UUID generation (`substring(0, 8)`).
  - Fetch the next sequence number from `sequence_tracker` based on the fetched `financial_year`.
  - Fetch the `category_code` based on the provided `category_id`.
  - Construct the `formatted_id` using `padStart(5, '0')` so it formats as `00001` instead of `0001`.
  - Inject `booking_seq`, `formatted_id`, and `financial_year` directly into the `booking_requests` insert query (or update it immediately after insert).

- **Approval Phase (`updateAdminStatus`)**
  - Completely strip out all `formatted_id`, `booking_seq`, and `sequence_tracker` logic from the approval step. Approvals will strictly handle status changes.

### 4. Frontend Configuration UI
#### [MODIFY] `frontend/src/components/reception/InstitutionConfigForm.jsx`
- Add a text input field for `financial_year` (e.g., "25-26", "26-27").
- Map it to the payload sent to the backend so the GHC can update it seamlessly.

## Verification Plan
1. **Config Update:** Log in as GHC, navigate to Billing Config, and update the Financial Year to `26-27`.
2. **Booking Creation:** Submit a new booking as a regular user.
3. **Database Check:** Verify that the new booking immediately receives a formatted ID like `NITTGH/26-27/CAT-I/00001` without waiting for approval.
4. **Approval Check:** Approve the booking to ensure no secondary formatting bugs occur.
