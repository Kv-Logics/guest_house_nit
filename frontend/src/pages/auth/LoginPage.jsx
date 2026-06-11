import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import nitLogo from '../../assets/images/nitlogo.png';
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
      const res = await requestOtp(email);
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
      const res = await verifyOtp(email, otp);
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
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${nitBg})` }}
    >
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px]"></div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <img src={nitLogo} alt="NIT Logo" className="w-24 h-24 mx-auto object-contain drop-shadow-lg" />
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          National Institute of Technology Trichy Guest House
        </h2>
        <p className="mt-2 text-center text-sm text-slate-200 drop-shadow-sm">Sign in to your account</p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
          <form className="space-y-6" onSubmit={step === 1 ? handleRequestOtp : handleVerifyOtp}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {step === 1 ? (
              <div>
                <label className="block text-sm font-bold text-slate-700">Email address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-xl p-3 border outline-none transition-all"
                    placeholder="e.g. student@nitt.edu"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700">Enter 6-digit OTP</label>
                <p className="text-xs text-slate-500 mb-2">Sent to {email}</p>
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
