import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Mail, KeyRound, AlertCircle, Loader2, User, Lock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' or 'OTP'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [recentEmails, setRecentEmails] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('recent_emails') || '[]');
    setRecentEmails(stored);
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/request-otp`, { email });
      if (response.data.success) {
        setSuccessMsg(response.data.message);
        setStep('OTP');
        setResendTimer(120); // Start 2-minute countdown
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { email, otp });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        const storedEmails = JSON.parse(localStorage.getItem('recent_emails') || '[]');
        if (!storedEmails.includes(email)) {
          const updatedEmails = [email, ...storedEmails].slice(0, 3); // Keep last 3 emails
          localStorage.setItem('recent_emails', JSON.stringify(updatedEmails));
        }
        
        navigate('/'); // Redirect to the main booking page
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl mb-4 text-blue-600 border border-blue-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">NITT Authentication</h2>
          <p className="text-slate-500 mt-2 font-medium">Secure access via Institutional Email</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl shadow-sm text-red-800 text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-xl shadow-sm text-green-800 text-sm">
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {step === 'EMAIL' ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <Mail className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="name@nitt.edu" />
            </div>
            
            {recentEmails.length > 0 && (
              <div className="mt-3 animate-fade-in">
                <p className="text-xs font-semibold text-slate-500 mb-2">Recent Accounts:</p>
                <div className="flex flex-wrap gap-2">
                  {recentEmails.map((recent, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEmail(recent)}
                      className="text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 py-1.5 px-3 rounded-full transition-colors flex items-center"
                    >
                      <User className="w-3 h-3 mr-1.5" />
                      {recent}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <button type="submit" disabled={isLoading} className={`w-full flex items-center justify-center py-3.5 px-6 rounded-xl shadow-sm text-lg font-bold text-white transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isLoading ? <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Sending...</> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-2">One-Time Password (OTP)</label>
              <KeyRound className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input required type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 tracking-widest font-mono focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="• • • • • •" />
            </div>
            
            <button type="submit" disabled={isLoading} className={`w-full flex items-center justify-center py-3.5 px-6 rounded-xl shadow-sm text-lg font-bold text-white transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed bg-blue-400' : 'bg-green-600 hover:bg-green-700'}`}>
              {isLoading ? <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Verifying...</> : 'Verify & Sign In'}
            </button>
            
            <div className="flex flex-col space-y-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" disabled={resendTimer > 0 || isLoading} onClick={handleRequestOtp} className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-bold disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
                {resendTimer > 0 ? `Resend OTP in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend OTP'}
              </button>
              <button type="button" onClick={() => { setStep('EMAIL'); setResendTimer(0); setOtp(''); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
                Change email address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}