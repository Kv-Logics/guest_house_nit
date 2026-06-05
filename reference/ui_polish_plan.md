# Implementation Plan: UI Polish for Booking Form & Route Sidebar

This plan addresses the UI/UX feedback for the Application Route sidebar and the Undertaking section of the Booking Form.

## User Review Required
> [!IMPORTANT]
> **Regarding Auto-fill (Setting 2):**
> For the browser's native auto-fill to trigger on inputs like "Full Name" or "Email", three conditions must be met:
> 1. You must have restarted the frontend `npm run dev` server so Vite could load the new `.env` file.
> 2. You must have previously typed and submitted those exact details into a form *on this browser* (the browser builds its own local dictionary).
> 3. Your browser settings must not have "Save and fill addresses/info" disabled.
> *Note: Since this is a React SPA, the browser sometimes struggles to trigger auto-fill until you actually interact with the field or hit a submit button wrapped in a `<form>`. The code is completely correct, it's just dependent on your local browser's internal data!*
>
> **Regarding Route State Colors:**
> Since this sidebar is on the *Application Creation* page, the application hasn't actually been submitted yet. Therefore, I will style the "Submitted" step as the active (Blue) state, and the subsequent authority/chairperson steps as pending (Gray).

## Proposed Changes

---

### [MODIFY] `frontend/src/components/forms/ApplicationRouteSidebar.jsx`
- **Step Visuals:** Remove the loud "STEP N" text. Use small filled circles (blue for step 1, gray for the rest) with the step number inside. Place the step title in a normal font weight directly beside it.
- **Connectors:** Thicken the connector lines to `2px`. Color the first connector blue (if active) and the rest gray (pending).
- **Chairperson Decision Card:** Remove the "decorative" send icons and down arrows. Combine the Approved/Rejected outcomes into a single card with two rows. Remove the harsh background fills and replace them with a clean white background, using a left border accent (`border-l-4 border-emerald-500` for Approved, `border-red-500` for Rejected).

### [MODIFY] `frontend/src/components/forms/BookingForm.jsx` (Undertaking Section)
- **Container Styling:** Reduce top padding and apply a subtle background color (`bg-[#f8fafb]`) to the Undertaking card.
- **List Styling:** Replace the plain text "a/b/c/d" paragraphs with a clean, numbered `<ol>` list. Add a left border accent line to the list container to anchor it visually.
- **Checkbox:** Move the checkbox inline and simplify the label text to exactly: *"I have read and agree to all conditions above"*, removing the redundant bold styling.

---

## Verification Plan
1. Open the `/book` page.
2. Verify the Route Sidebar has clean, numbered circles and a unified outcome card with left border accents instead of harsh colors.
3. Verify the Undertaking section has a subtle background, a numbered list with a left accent border, and a simplified inline checkbox.
