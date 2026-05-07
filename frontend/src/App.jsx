import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import SuccessPage from './pages/SuccessPage';
import ErrorPage from './pages/ErrorPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PreviewPage from './pages/PreviewPage';
import { LogOut } from 'lucide-react';
import nitlogo from '../nitlogo.png';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation(); // Triggers header re-render on navigation
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200 selection:text-blue-900">
        
        {/* Premium Top Navbar */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <img src={nitlogo} alt="NIT Trichy Logo" className="w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-sm group-hover:opacity-90 transition-opacity" />
              <span className="text-xl md:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-950 tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity">
                NITT Guest House Portal
              </span>
            </Link>
            
            {/* Main Navigation Tabs */}
            {user && (
              <nav className="hidden lg:flex ml-8 space-x-2">
                <Link to="/" className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Dashboard & Payments</Link>
                <Link to="/book" className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${location.pathname === '/book' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Book a Room</Link>
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <div className="flex items-center space-x-3 text-sm bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="hidden sm:block text-right">
                  <p className="font-bold text-slate-800 text-xs">{user.full_name}</p>
                  <p className="text-[10px] font-semibold text-slate-500 truncate max-w-[120px]">{user.department || user.role}</p>
                </div>
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-sm bg-green-50/80 backdrop-blur-sm text-green-700 py-2 px-3 sm:px-4 rounded-full border border-green-200 shadow-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="font-semibold tracking-wide uppercase text-xs hidden sm:block">System Online</span>
              </div>
            )}
            {user && (
              <button onClick={handleLogout} className="flex items-center text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 py-2 px-3 sm:px-4 rounded-xl transition-all shadow-sm">
                <LogOut className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:block">Logout</span>
              </button>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/error" element={<ErrorPage />} />
            
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
  );
}

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
export default App;