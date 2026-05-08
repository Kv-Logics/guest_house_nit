import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import SuccessPage from './pages/SuccessPage';
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PreviewPage from './pages/PreviewPage';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        
        {/* Enterprise Protected Routing System */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
export default App;