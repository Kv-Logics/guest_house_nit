import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          NITT Guest House
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">Sign in to your account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
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
