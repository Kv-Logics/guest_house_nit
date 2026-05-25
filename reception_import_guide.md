# Reception Module Import & Integration Guide

This guide describes how to import the **Reception Module** code built on another PC and integrate it into this Guest House project. Follow these steps to ensure all frontend views, routes, backend controllers, and database access functions align perfectly with the core application.

---

## 1. Directory Structure Placement

Copy the files you built on your other PC into the following directories within this project:

### 📂 Backend Files
Copy your backend files into their respective subdirectories inside the `backend/src/` folder:

| File Type | Source File (from other PC) | Destination Path (in this project) |
| :--- | :--- | :--- |
| **Controller** | `reception.controller.js` | [backend/src/controllers/](file:///C:/Users/keert/NIT%20Projects/guesthouse/backend/src/controllers/) |
| **Service** | `reception.service.js` | [backend/src/services/](file:///C:/Users/keert/NIT%20Projects/guesthouse/backend/src/services/) |
| **Repository**| `reception.repository.js` | [backend/src/repositories/](file:///C:/Users/keert/NIT%20Projects/guesthouse/backend/src/repositories/) |
| **Routes** | `reception.routes.js` | [backend/src/routes/](file:///C:/Users/keert/NIT%20Projects/guesthouse/backend/src/routes/) |

### 📂 Frontend Files
Copy your frontend files into their respective subdirectories inside the `frontend/src/` folder:

| File Type | Source File (from other PC) | Destination Path (in this project) |
| :--- | :--- | :--- |
| **Page/View** | `ReceptionDashboard.jsx` | [frontend/src/pages/dashboard/](file:///C:/Users/keert/NIT%20Projects/guesthouse/frontend/src/pages/dashboard/) |
| **Service** | `reception.service.js` | [frontend/src/services/](file:///C:/Users/keert/NIT%20Projects/guesthouse/frontend/src/services/) |

---

## 2. Backend Integration & Router Registration

To make the core Express API list and run the new reception endpoints, modify the central route index:

1. Open [backend/src/routes/index.js](file:///C:/Users/keert/NIT%20Projects/guesthouse/backend/src/routes/index.js).
2. Import and safely mount `reception.routes.js`:

```javascript
// Import the routes near the top of the file
const receptionRoutes = require('./reception.routes');

// Mount the routes under the /reception path
safeMount('/reception', receptionRoutes);
```

> [!NOTE]
> Make sure `reception.routes.js` exports its router correctly (e.g. `module.exports = router;`). The `safeMount` helper will automatically handle fallback protection to prevent system crashes.

---

## 3. Frontend Integration & App Router Setup

To display the imported Reception Dashboard in the React application, register the page component in the routing system:

1. Open [frontend/src/App.jsx](file:///C:/Users/keert/NIT%20Projects/guesthouse/frontend/src/App.jsx).
2. Add the lazy-loaded page import at the top (under other pages):
   ```javascript
   const ReceptionDashboard = React.lazy(() => import('./pages/dashboard/ReceptionDashboard'));
   ```
3. Register the path route within the `ProtectedRoute` element check, specifically matching `reception_staff` roles:
   ```javascript
   {/* Reception Protected Routes */}
   <Route
     element={
       <ProtectedRoute
         allowedRoles={['reception_staff', 'super_admin', 'guest_house_admin']}
       />
     }
   >
     <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
   </Route>
   ```

---

## 4. Resolving Dependencies

If your imported code uses third-party libraries that are not currently installed in this repository:

1. **Check Packages:** Open the `package.json` file from your other PC's frontend/backend and look at the `dependencies` list.
2. **Install Missing Backend Packages:** Run this in the `backend/` directory:
   ```bash
   npm install <package-name>
   ```
3. **Install Missing Frontend Packages:** Run this in the `frontend/` directory:
   ```bash
   npm install <package-name>
   ```

---

## 5. Verify the Integration

After copying the files and updating the routes, verify the build compiles correctly:

1. **Run Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
2. **Run Frontend Dev Server:**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Validate Login:** Log in using a test account with the `reception_staff` role to confirm access is granted to `/reception/dashboard`.
