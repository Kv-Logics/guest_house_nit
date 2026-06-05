# Implementation Plan: Form Persistence & Browser Autofill

This plan outlines the implementation of two features to improve the user experience of the booking application form without relying on backend server calls.

## User Review Required
> [!IMPORTANT]
> - **Autofill Security:** Browser autocomplete caches user details like name, phone, and email locally in the user's browser. Since this is an institutional app, shared computers could auto-suggest previous applicants' details if they don't use Incognito mode. This is why having `VITE_ENABLE_AUTOFILL` as a toggleable flag in `.env` is a very smart security measure!

## Proposed Changes

---

### [MODIFY] Local Form Persistence (Setting 1)

**File:** `frontend/src/pages/booking/BookingPage.jsx`
- **Initial State:** We will update the `useState` initialization for `formData`. Before returning the default empty form, we will check `localStorage.getItem('nitt_booking_draft')`. If a draft exists (and we are not editing an existing booking), we will load it.
- **Draft Saving:** We will add a `useEffect` hook that listens to `formData`. Every time the user types a character and `formData` changes, we will securely save it to `localStorage` (e.g., `localStorage.setItem('nitt_booking_draft', JSON.stringify(formData))`).
- **Remove Premature Deletion:** We will remove the line `localStorage.removeItem('nitt_booking_draft');` that currently runs on page load. 

**File:** `frontend/src/pages/booking/PreviewPage.jsx` (or wherever final submission occurs)
- **Draft Clearing:** Upon successful submission to the backend (when the booking is officially saved), we will execute `localStorage.removeItem('nitt_booking_draft')`. This ensures the next time they open the form, it is blank.

---

### [MODIFY] Browser Autofill Suggestions (Setting 2)

**File:** `frontend/.env` (and `.env.production`)
- We will add the flag: `VITE_ENABLE_AUTOFILL=true`

**File:** `frontend/src/components/forms/MultiGuestSection.jsx` & `BookingForm.jsx`
- We will read the environment flag: `const enableAutofill = import.meta.env.VITE_ENABLE_AUTOFILL === 'true';`
- We will conditionally apply standard HTML5 `autoComplete` attributes to the input fields. 
  - *Guest Name:* `autoComplete={enableAutofill ? "name" : "off"}`
  - *Phone:* `autoComplete={enableAutofill ? "tel" : "off"}`
  - *Email:* `autoComplete={enableAutofill ? "email" : "off"}`
  - *Designation:* `autoComplete={enableAutofill ? "organization-title" : "off"}`
- This will natively prompt the user's browser (Chrome/Edge/Safari) to suggest previously entered names and emails from their device's cache.

---

## Verification Plan

### Manual Verification
1. Open the application form, fill in a Guest Name and Email.
2. Hit `F5` (Refresh) on the browser.
3. Verify that the Guest Name and Email are still there (Setting 1 working).
4. Go to the Preview page and click Submit.
5. Verify that navigating back to the Application form shows a completely blank form (Draft cleared).
6. Verify that clicking on the "Guest Name" input drops down a browser suggestion list with your old name (Setting 2 working).
