import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import SuccessPage from './pages/SuccessPage';
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PreviewPage from './pages/PreviewPage';
import ApplicantDashboard from './pages/dashboard/ApplicantDashboard';
import ApproverDashboard from './pages/dashboard/ApproverDashboard';
import ReceptionDashboard from './pages/dashboard/ReceptionDashboard';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './utils/constants';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>
              
              {/* Approver Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD, ROLES.FACULTY]} />}>
                <Route path="/approvals/dashboard" element={<ApproverDashboard />} />
              </Route>
              
              {/* Reception Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]} />}>
                <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
              </Route>
              
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;