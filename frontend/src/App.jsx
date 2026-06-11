import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './utils/constants';
import ErrorBoundary from './components/ui/ErrorBoundary';

const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const BookingPage = React.lazy(() => import('./pages/booking/BookingPage'));
const SuccessPage = React.lazy(() => import('./pages/booking/SuccessPage'));
const ErrorPage = React.lazy(() => import('./pages/booking/ErrorPage'));
const PreviewPage = React.lazy(() => import('./pages/booking/PreviewPage'));
const ApplicantDashboard = React.lazy(() => import('./pages/dashboard/ApplicantDashboard'));
const ApproverDashboard = React.lazy(() => import('./pages/dashboard/ApproverDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/dashboard/AdminDashboard'));
const ReceptionDashboard = React.lazy(() => import('./pages/dashboard/ReceptionDashboard'));
const GHCoordinatorDashboard = React.lazy(() => import('./pages/dashboard/GHCoordinatorDashboard'));
const ManagePayments = React.lazy(() => import('./pages/dashboard/ManagePayments'));
const ReportsDashboard = React.lazy(() => import('./pages/dashboard/ReportsDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense
            fallback={
              <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                <CircularProgress />
              </Box>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<Navigate to="/login" replace />} />

              {/* Enterprise Protected Routing System */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  {/* Role-Specific Dashboard Redirects */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* General / Applicant Routes */}
                  <Route path="/dashboard" element={<ApplicantDashboard />} />
                  <Route path="/book" element={<BookingPage />} />
                  <Route path="/preview" element={<PreviewPage />} />
                  <Route path="/success" element={<SuccessPage />} />
                  <Route path="/error" element={<ErrorPage />} />

                  {/* Admin Protected Routes */}
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN]} />
                    }
                  >
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  </Route>

                  {/* Approver Protected Routes */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD, ROLES.FACULTY, ROLES.DIRECTOR]}
                      />
                    }
                  >
                    <Route path="/approvals/dashboard" element={<ApproverDashboard />} />
                  </Route>

                  {/* Reception Protected Routes */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.RECEPTIONIST, ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN]}
                      />
                    }
                  >
                    <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
                  </Route>

                  {/* GH Coordinator Protected Routes */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.GH_COORDINATOR, ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN]}
                      />
                    }
                  >
                    <Route path="/coordinator/dashboard" element={<GHCoordinatorDashboard />} />
                  </Route>

                  {/* Shared Admin/Reception/GH Coord Routes */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.RECEPTIONIST, ROLES.GH_COORDINATOR]}
                      />
                    }
                  >
                    <Route path="/manage-payments" element={<ManagePayments />} />
                  </Route>

                  {/* Reports Route */}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR]}
                      />
                    }
                  >
                    <Route path="/reports" element={<ReportsDashboard />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
export default App;
