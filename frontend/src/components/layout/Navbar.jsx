import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  Menu,
  X,
  PlusCircle,
  ClipboardCheck,
  ShieldCheck,
  Key,
  FileText,
} from 'lucide-react';
import { ROLES } from '../../utils/constants';
import nitLogo from '../../assets/images/nitlogo.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  let primaryPath = '/dashboard';
  if (user?.role === ROLES.RECEPTIONIST) primaryPath = '/reception/dashboard';
  else if ([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN].includes(user?.role))
    primaryPath = '/admin/dashboard';
  else if ([ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD, ROLES.FACULTY].includes(user?.role))
    primaryPath = '/approvals/dashboard';

  const dynamicNavLinks = [];
  if (user) {
    const role = user.role;

    if (role !== ROLES.RECEPTIONIST) {
      dynamicNavLinks.push({ name: 'Applied Applications', path: '/dashboard', icon: FileText });
      dynamicNavLinks.push({ name: 'Add Application', path: '/book', icon: PlusCircle });
    }
    if ([ROLES.REGISTRAR, ROLES.DEAN, ROLES.HOD, ROLES.FACULTY].includes(role)) {
      dynamicNavLinks.push({
        name: 'Review Applications',
        path: '/approvals/dashboard',
        icon: ClipboardCheck,
      });
    }
    if ([ROLES.ADMIN, ROLES.GUEST_HOUSE_ADMIN].includes(role)) {
      dynamicNavLinks.push({ name: 'Admin Console', path: '/admin/dashboard', icon: ShieldCheck });
    }
    if (role === ROLES.RECEPTIONIST) {
      dynamicNavLinks.push({ name: 'Front Desk', path: '/reception/dashboard', icon: Key });
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to={primaryPath}
              className="flex-shrink-0 flex items-center gap-3 transition-transform hover:scale-105 mr-6"
            >
              <img src={nitLogo} alt="NIT Logo" className="w-10 h-10 object-contain" />
              <span className="font-extrabold text-xl text-slate-800 tracking-tight hidden sm:block">
                NITT Guest House
              </span>
            </Link>

            <nav className="hidden lg:flex md:space-x-1">
              {dynamicNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-3 border-r border-slate-200 pr-5 mr-1">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {user.name || user.email}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 capitalize mt-1 tracking-wider">
                    {String(user.role || '').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold shadow-inner">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 shadow-sm text-sm font-bold rounded-xl text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <div className="flex lg:hidden items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white absolute w-full shadow-xl z-40">
          <div className="pt-2 pb-4 space-y-1 px-4">
            {dynamicNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
