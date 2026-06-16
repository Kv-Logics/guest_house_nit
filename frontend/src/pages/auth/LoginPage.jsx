import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import nitLogo from '../../assets/images/nitt_logo.svg';
import nitBg from '../../assets/images/NitImgBg.jpeg';

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Where to redirect the user after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@')) {
        normalizedEmail = `${normalizedEmail}@nitt.edu`;
      }
      const res = await requestOtp(normalizedEmail);
      if (res && res.success) {
        setStep(2);
        if (res.data && res.data.otp) {
          setOtp(res.data.otp);
        }
      } else {
        setError(res?.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while requesting OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      let normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@')) {
        normalizedEmail = `${normalizedEmail}@nitt.edu`;
      }
      const res = await verifyOtp(normalizedEmail, otp);
      if (res && res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res?.message || 'Invalid OTP.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col p-6 sm:p-8 lg:p-10 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${nitBg})` }}
    >
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full flex flex-row items-center gap-4 sm:gap-6">
        <img src={nitLogo} alt="NIT Logo" className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-lg" />
        <div className="flex flex-col text-left">
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
            National Institute of Technology Trichy Guest House
          </h2>
          <p className="mt-1 text-sm sm:text-base text-slate-200 drop-shadow-sm">Sign in to your account</p>
        </div>
      </div>

      <div className="relative z-10 mt-auto mb-auto sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
          <form className="space-y-6" onSubmit={step === 1 ? handleRequestOtp : handleVerifyOtp}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {step === 1 ? (
              <div>
                <label className="block text-sm font-bold text-slate-700">Username/Rollno</label>
                <div className="mt-1 flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden bg-white shadow-sm transition-all">
                  <input
                    type="text"
                    required
                    value={email.split('@')[0]}
                    onChange={(e) => setEmail(e.target.value.split('@')[0])}
                    className="flex-1 min-w-0 block w-full px-4 py-3 sm:text-sm border-0 focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400 bg-transparent font-medium"
                    placeholder=""
                    disabled={isLoading}
                  />
                  <div className="flex-shrink-0 flex items-center justify-center px-4 bg-slate-50 border-l border-slate-200 text-slate-500 font-bold select-none sm:text-sm">
                    @nitt.edu
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700">Enter 6-digit OTP</label>
                <p className="text-xs text-slate-500 mb-2">Sent to {email.includes('@') ? email : `${email}@nitt.edu`}</p>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-xl p-3 border outline-none transition-all text-center tracking-widest text-lg font-mono"
                    placeholder="000000"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Processing...' : step === 1 ? 'Request OTP' : 'Verify & Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
