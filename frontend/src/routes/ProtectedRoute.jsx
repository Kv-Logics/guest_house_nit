import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict Role validation against arrays passed into Route configurations
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Fallback routing: bounce unauthorized users back to their native dashboards
    if ([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN].includes(user.role))
      return <Navigate to="/admin/dashboard" replace />;
    if ([ROLES.RECEPTIONIST].includes(user.role))
      return <Navigate to="/reception/dashboard" replace />;
    if ([ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD].includes(user.role))
      return <Navigate to="/approvals/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
