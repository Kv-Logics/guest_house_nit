# Implementation Plan: POS/Cash Payment, Dynamic Invoices & Bulk Room Management

This plan outlines the combined implementation of the POS/Cash Payment flow, Dynamic Invoice Generation (with a specific NITTGH billing sequence format), and the Bulk Room Booking console.

## User Review Required
> [!IMPORTANT]
> - **Invoice Number Format**: The auto-generated invoice number will follow this format:
>   - For individual rooms: `NITTGH/CAT-{CategoryCode}/{ShortBookingId}:{RoomNumber}` (e.g. `NITTGH/CAT-I/0001:1` for Room 1, `NITTGH/CAT-I/0001:2` for Room 2).
>   - For the booking request overall: `NITTGH/CAT-{CategoryCode}/{ShortBookingId}` (e.g., `NITTGH/CAT-I/0001`).
> - **Rounding Logic**: Taxable value CGST and SGST will be rounded off to nearest rupees symmetrically:
>   - CGST = `Math.round(taxable * 0.06)`
>   - SGST = `Math.round(taxable * 0.06)`
>   - Grand Total = `taxable + CGST + SGST`.
>   This prevents uneven splits and mismatch issues.

## Proposed Changes

---

### Database Changes
1. Create `institution_configs` table to store static billing details:
   ```sql
   CREATE TABLE IF NOT EXISTS institution_configs (
       config_id SERIAL PRIMARY KEY,
       legal_name VARCHAR(255) DEFAULT 'NIT Trichy Guest House',
       gstin VARCHAR(50) DEFAULT '33AAAAA0000A1Z5',
       pan VARCHAR(50) DEFAULT 'AAAAA0000A',
       address TEXT DEFAULT 'Tanjore Main Road, NH 67, Tiruchirappalli, Tamil Nadu - 620015',
       signatory_name VARCHAR(150) DEFAULT 'Authorized Officer',
       signatory_designation VARCHAR(100) DEFAULT 'GH Coordinator',
       invoice_prefix VARCHAR(50) DEFAULT 'NITTGH/',
       sac_code VARCHAR(20) DEFAULT '996311',
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Insert default row
   INSERT INTO institution_configs (config_id) VALUES (1) ON CONFLICT DO NOTHING;
   ```
2. Modify `final_bills` to store POS/Cash transaction info:
   ```sql
   ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50); -- 'Cash' or 'POS'
   ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS amount_received NUMERIC;
   ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(100);
   ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(user_id);
   ALTER TABLE final_bills ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) UNIQUE;
   ```
3. Add `is_bulk` boolean to `booking_requests` table to support bulk reservations:
   ```sql
   ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN DEFAULT false;
   ```

---

### Backend Service & Repository

#### [MODIFY] reception.repository.js
- Add functions to support bulk operations: creating a bulk block, listing active bulk blocks, and checking in walk-in guests.
- Add query functions to fetch and update `institution_configs`.

#### [MODIFY] reception.service.js
- Implement billing confirmation logic:
  - Generate the invoice code in the format: `NITTGH/CAT-{CategoryCode}/{ShortBookingId}:{RoomNumber}`.
  - Apply symmetric CGST (6%) and SGST (6%) rounding.
- Implement bulk room blocking:
  - Keep rooms in a restricted bulk block state.
  - Allow walk-in check-in/check-out.

#### [MODIFY] reception.routes.js
- Add GET/POST `/reception/institution-config`.
- Add POST `/reception/bookings/:bookingId/confirm-payment`.
- Add bulk block endpoints (`/reception/bulk-block`, `/reception/bulk-block/:id/check-in`, etc.).

---

### Frontend Components

#### [NEW] PaymentsTab.jsx
- Tab containing all checked-out stays requiring payment settlement.
- Receptionist reviews the final ledger (no edits, just click confirm), manually inputs payment amount, payment mode (Cash/POS), and POS slip reference number, and generates the final bill.

#### [NEW] BulkRoomsTab.jsx
- Dashboard panel to manage bulk bookings, block rooms, and handle walk-ins.

#### [NEW] InstitutionConfigForm.jsx
- Form in the coordinator dashboard to edit static billing settings.

#### [MODIFY] ReceptionDashboard.jsx
- Add Payments, Bulk Rooms, and Billing Config to navigation tabs.

---

## Verification Plan

### Automated/Manual Tests
- Confirm POS payment updates state to `PAID via POS` with slip number.
- Verify invoice format is output correctly on print preview.
- Test bulk reservation walk-in and checkout flows.
