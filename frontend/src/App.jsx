import React, { Suspense } from 'react';
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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
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
                  <Route element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]} />}>
                    <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
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
