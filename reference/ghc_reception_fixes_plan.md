# Fix Production Gaps & Logic Issues

This implementation plan addresses the five specific issues raised regarding night calculation, UI/UX improvements, access control, formatting, and the time machine feature flag.

## User Review Required

> [!IMPORTANT]
> **Night Calculation Logic:** I will replace the current `Math.ceil((Departure - Arrival) / 24 hours)` logic in the frontend with a standard hotel industry calculation: `Nights = Departure Date - Arrival Date` (ignoring the time portion). If arrival and departure are on the same day, it counts as 1 night. This prevents 29.5 hours from being incorrectly billed as 2 nights. Please confirm this matches your expectations.

## Proposed Changes

### 1. Night Calculation Consistency

The frontend currently uses `Math.ceil` based on raw milliseconds, which causes 29.5 hours to round up to 2 nights.

#### [NEW] `frontend/src/utils/date.js`
- Create a new utility function `calculateHotelNights(arrival, departure)` that zeroes out the time portion of both dates before calculating the difference in days (with a minimum of 1 night).

#### [MODIFY] `frontend/src/pages/dashboard/GHCoordinatorDashboard.jsx`
- Replace `Math.ceil` logic with `calculateHotelNights` for calculating `days` when generating the overridden bill.

#### [MODIFY] `frontend/src/components/reception/ArrivalsTab.jsx`, `frontend/src/pages/booking/BookingPage.jsx`, `frontend/src/pages/booking/PreviewPage.jsx`, `frontend/src/pages/booking/GSTInvoiceModal.jsx`
- Replace all instances of `Math.ceil` night calculations with the new `calculateHotelNights` utility for consistency across the entire app.

---

### 2. UI Updates (Reception & Payments)

#### [MODIFY] `frontend/src/pages/dashboard/ReceptionDashboard.jsx`
- **Full Width:** Remove the `max-w-7xl` constraint on the main wrapper so the dashboard utilizes the full width of the screen.

#### [MODIFY] `frontend/src/components/reception/PaymentsTab.jsx`
- **Ledger Preview:** Show the itemized ledger breakdown (from `selectedBooking.breakdown.items` or by fetching the preview) directly in the "Settle Payment" drawer *before* the user clicks Settle. This allows the receptionist to validate the charges based on actual stay duration.

#### [MODIFY] `frontend/src/pages/booking/GSTInvoiceModal.jsx`
- **Booking Ref:** Update the invoice template to display the new `formatted_id` (e.g., `NITTGH/25-26/CAT-I/0001`) instead of the raw UUID or short hash.

---

### 3. GHC Permissions Error

The backend `constants.js` file is missing the `GH_COORDINATOR` role definition, which causes `requireRole([ROLES.GH_COORDINATOR])` to evaluate to `undefined`, rejecting the coordinator's access.

#### [MODIFY] `backend/src/utils/constants.js`
- Add `GH_COORDINATOR: 'gh_coordinator'` to the `ROLES` object.

---

### 4. GHC Dashboard Search & Formatting

#### [MODIFY] `frontend/src/pages/dashboard/GHCoordinatorDashboard.jsx`
- **Search Logic:** Update `handleSearch` to match against the full `formatted_id` (e.g., `NITTGH/...`) in addition to the short ID.
- **Ops List Formatting:** Ensure that the "Ops" list explicitly renders `formatted_id` instead of a truncated UUID. (Note: A previous commit attempted this, but I will reinforce it to ensure the new format is used consistently).
- **Admin Overrides:** Will add validation to the Global Override settings so that the coordinator inputs valid numbers and logic correctly applies to the booking.

#### [MODIFY] `frontend/src/components/layout/QRScannerModal.jsx`
- **QR Parsing:** Update the QR scanner logic to correctly parse the new `formatted_id` format if it's embedded in the QR code.

---

### 5. Time Machine Feature Flag

The time machine is currently always visible. It should be disabled in production unless explicitly enabled via an environment variable.

#### [MODIFY] `frontend/.env` and `frontend/.env.example`
- Add `VITE_ENABLE_TIME_MACHINE=false`

#### [MODIFY] `frontend/src/services/api.js`
- Check `import.meta.env.VITE_ENABLE_TIME_MACHINE === 'true'` before attaching the `X-Mock-Date` header to requests.

#### [MODIFY] `frontend/src/pages/dashboard/ReceptionDashboard.jsx`
- Hide the "Time Machine / Clock Simulator" UI panel completely if the feature flag is set to false.

## Verification Plan

### Manual Verification
1. **Billing:** Test a stay from `7 Jun 6:30 AM` to `8 Jun 12:00 PM` (29.5 hours) in the GHC override panel and ensure it calculates exactly 1 night.
2. **Access:** Log in as `gh_coordinator` and verify access is granted without the "Forbidden" error.
3. **UI Layout:** Open Reception Dashboard on a wide monitor to confirm it stretches full width.
4. **Time Machine:** Toggle the `.env` flag to `false` and confirm the UI panel disappears and mock dates are ignored.
