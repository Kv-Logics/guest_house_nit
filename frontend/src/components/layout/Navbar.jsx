import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  Menu,
  X,
  PlusCircle,
  ClipboardCheck,
  ShieldCheck,
  Key,
  FileText,
  BarChart3,
} from 'lucide-react';
import { ROLES } from '../../utils/constants';
import { approvalService } from '../../services/approval.service';
import api from '../../services/api';
import nitLogo from '../../assets/images/nitt_logo.svg';

// WhatsApp-style notification badge
function NavBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-2 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const role = user?.role;

  const isAuthority = [ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD, ROLES.DIRECTOR].includes(role);
  const isAdmin = [ROLES.GUEST_HOUSE_ADMIN, ROLES.GH_COORDINATOR].includes(role);

  // Fetch pending count for authority (pending approvals waiting for them)
  const { data: approvalData } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: approvalService.getPendingApprovals,
    enabled: isAuthority,
    staleTime: 30000,
    refetchInterval: 60000, // refresh every 60s
  });

  // Fetch pending count for admin (PENDING_ADMIN bookings)
  const { data: adminData } = useQuery({
    queryKey: ['adminPendingCount'],
    queryFn: () => api.get('/bookings/admin/all?status=PENDING_ADMIN'),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const authorityPendingCount = approvalData?.data?.length || 0;
  const adminPendingCount = adminData?.data?.totalCount || adminData?.data?.rows?.length || 0;

  let primaryPath = '/dashboard';
  if (role === ROLES.RECEPTIONIST) primaryPath = '/reception/dashboard';
  else if (role === ROLES.GH_COORDINATOR) primaryPath = '/coordinator/dashboard';
  else if (isAdmin) primaryPath = '/admin/dashboard';
  else if (isAuthority) primaryPath = '/approvals/dashboard';

  const dynamicNavLinks = [];
  if (user) {
    if (role === ROLES.RECEPTIONIST) {
      dynamicNavLinks.push({
        name: 'Reception Dashboard',
        path: '/reception/dashboard',
        icon: ClipboardCheck,
        count: 0,
      });
    } else if (role === ROLES.GH_COORDINATOR) {
      dynamicNavLinks.push({
        name: 'GHC Operations',
        path: '/coordinator/dashboard',
        icon: ShieldCheck,
        count: 0,
      });
    } else {
      dynamicNavLinks.push({ name: 'Applied Applications', path: '/dashboard', icon: FileText, count: 0 });
      dynamicNavLinks.push({ name: 'Add Application', path: '/book', icon: PlusCircle, count: 0 });
    }
    if (isAuthority) {
      dynamicNavLinks.push({
        name: 'Manage Requests',
        path: '/approvals/dashboard',
        icon: ClipboardCheck,
        count: authorityPendingCount,
      });
    }
    if (isAdmin) {
      dynamicNavLinks.push({
        name: 'Manage Requests',
        path: '/admin/dashboard',
        icon: ShieldCheck,
        count: adminPendingCount,
      });
    }
    if (isAdmin || role === ROLES.GH_COORDINATOR) {
      dynamicNavLinks.push({
        name: 'Manage Payments',
        path: '/manage-payments',
        icon: FileText,
        count: 0,
      });
    }
    if (isAdmin) {
      dynamicNavLinks.push({
        name: 'Reports',
        path: '/reports',
        icon: BarChart3,
        count: 0,
      });
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 w-full flex-shrink-0 flex flex-col">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to={primaryPath}
            className="flex-shrink-0 flex items-center gap-3 transition-transform hover:scale-102"
          >
            <img src={nitLogo} alt="NIT Logo" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-black text-sm lg:text-base text-slate-800 tracking-tight hidden sm:block">
                National Institute of Technology
              </span>
              <span className="font-extrabold text-blue-600 text-[10px] lg:text-xs tracking-widest hidden sm:block uppercase">
                Guest House
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-2">
            {dynamicNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-[13px] font-bold transition-all relative ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                >
                  <Icon className={`w-4 h-4 mr-2 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                  {link.name}
                  {link.count > 0 && <NavBadge count={link.count} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-3 border-r border-slate-200 pr-5 mr-1 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shadow-inner flex-shrink-0">
                {(user.faculty_name || user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.faculty_name || user.name || user.email.split('@')[0]}
                </p>
                <p className="text-[10px] font-bold text-slate-500 capitalize mt-0.5 tracking-wider truncate">
                  {user.role === 'guest_house_admin' ? 'GH Chairperson' : String(user.role || '').replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => logout()}
            className="hidden lg:inline-flex items-center justify-center px-4 py-2 border border-slate-200 shadow-sm text-xs font-bold rounded-xl text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            <span>Sign Out</span>
          </button>

          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white absolute w-full shadow-2xl z-40 top-full left-0">
          <div className="pt-2 pb-6 space-y-1 px-4">
            {dynamicNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {link.name}
                  {link.count > 0 && <NavBadge count={link.count} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
