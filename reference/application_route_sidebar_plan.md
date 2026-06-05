# Implementation Plan: Application Route Sidebar

This plan details the process of moving the Application Route from inside the booking form to a dedicated visual sidebar on the left, and updating the steps and branching logic as requested.

## Proposed Changes

---

### [NEW] `frontend/src/components/forms/ApplicationRouteSidebar.jsx`
We will create a new React component to hold this static UI.
- **Dynamic Steps:** It will calculate the steps based on the `formData.category_id`, `room_type`, and `user.role` (just like the old one).
- **Step Names:** We will rename "GH Manager" to **"GH Chairperson"**. We will ensure "GH Coordinator" is never shown.
- **Workflow Branches:** After the final approval step (GH Chairperson), we will draw two distinct branches using CSS/SVG lines:
  - ✅ **Approved:** Pointing to an "Applicant" box with a subtext "QR Code Sent".
  - ❌ **Rejected:** Pointing to an "Applicant" box with a subtext "Rejection Notice".
- **Visual Design:** We will use vertical lines connecting circles (like a stepper or timeline) which looks fantastic on a left sidebar, using TailwindCSS.

### [MODIFY] `frontend/src/pages/booking/BookingPage.jsx`
- We will expand the max-width of the page container from `max-w-4xl` to `max-w-7xl` to accommodate the sidebar.
- We will change the layout to a CSS Grid: `grid grid-cols-1 lg:grid-cols-4 gap-8 items-start`.
- We will place `<ApplicationRouteSidebar />` in the first column (`col-span-1`) with a `sticky top-8` class so it stays visible as the user scrolls down the form.
- The `<BookingForm />` will take up the remaining space (`col-span-3`).

### [MODIFY] `frontend/src/components/forms/BookingForm.jsx`
- We will remove the old inline "Dynamic Route Map" (around lines 188-225) since it has been moved to the sidebar.

---

## Verification Plan
1. Open the `/book` page.
2. Verify that the Application Route appears on the left side of the screen.
3. Verify that the final step is "GH Chairperson".
4. Verify that the timeline visually branches into "Accept -> QR Code to Applicant" and "Reject -> To Applicant".
5. Change categories in the form and verify that the steps in the sidebar update dynamically in real-time.
