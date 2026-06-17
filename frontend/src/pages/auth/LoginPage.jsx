import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import nitLogo from '../../assets/images/nitt_logo.svg';
import nitBg from '../../assets/images/NitImgBg.jpeg';
import nittBgSvg from '../../assets/nitt_svg.svg';

export default function LoginPage() {
  const { requestOtp, checkUserStatus, verifyOtp, loginWithPassword, setupPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // step: 1 (Username check), 2 (OTP), 3 (Setup Password), 4 (Password Login)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const formatEmail = (val) => {
    let normalized = val.trim().toLowerCase();
    if (!normalized.includes('@') && normalized.length > 0) {
      return `${normalized}@nitt.edu`;
    }
    return normalized;
  };

  const handleCheckUsername = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your Username/Rollno.');
      return;
    }
    setError('');
    setIsLoading(true);

    const finalEmail = formatEmail(email);
    try {
      const res = await checkUserStatus(finalEmail);
      if (res && res.success) {
        if (res.data?.hasPassword) {
          setStep(4); // User has password, proceed to password entry
        } else {
          // Password is not set, trigger OTP setup flow
          const otpRes = await requestOtp(finalEmail);
          if (otpRes && otpRes.success) {
            setStep(2);
            if (otpRes.data && otpRes.data.otp) {
              setOtp(otpRes.data.otp);
            }
          } else {
            setError(otpRes?.message || 'Failed to send OTP to setup password.');
          }
        }
      } else {
        setError(res?.message || 'Failed to verify user status.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'User not found. Please contact administration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const finalEmail = formatEmail(email);
    const res = await loginWithPassword(finalEmail, password);
    if (res && res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res?.message || 'Invalid credentials.');
    }
    setIsLoading(false);
  };

  const handleRequestOtp = async () => {
    if (!email) {
      setError('Please enter your Username/Rollno first.');
      return;
    }
    setError('');
    setIsLoading(true);

    const finalEmail = formatEmail(email);
    const res = await requestOtp(finalEmail);
    if (res && res.success) {
      setStep(2);
      if (res.data && res.data.otp) {
        setOtp(res.data.otp);
      }
    } else {
      setError(res?.message || 'Failed to send OTP.');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const finalEmail = formatEmail(email);
    const res = await verifyOtp(finalEmail, otp);
    if (res && res.success) {
      if (res.data?.requirePasswordSetup || res.requirePasswordSetup) {
        setSetupToken(res.data?.setupToken || res.setupToken);
        setStep(3);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setError(res?.message || 'Invalid OTP.');
    }
    setIsLoading(false);
  };

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setIsLoading(true);

    const res = await setupPassword(setupToken, newPassword);
    if (res && res.success) {
      navigate(from, { replace: true });
    } else {
      setError(res?.message || 'Failed to setup password.');
    }
    setIsLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${nitBg})` }}
    >
      {/* Light mask overlay to ensure high readability and simple white aesthetic */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] z-0" />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-8 flex items-center gap-4 shadow-sm z-10 relative">
        <img src={nitLogo} alt="NIT Logo" className="w-16 h-16 object-contain" />
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            National Institute of Technology Tiruchirappalli
          </h1>
          <h2 className="text-sm sm:text-base font-medium text-slate-600">
            Guest House Management System
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">
              {step === 3 ? 'Setup Password' : step === 4 ? 'Enter Password' : 'Login'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {step === 3 
                ? 'Create a secure password for your account' 
                : step === 4 
                  ? 'Please enter your password to login' 
                  : step === 2 
                    ? 'Verify code sent to your registered email' 
                    : 'Please enter your credentials to proceed'}
            </p>
          </div>

          <div className="p-6">
            <form className="space-y-5" onSubmit={step === 1 ? handleCheckUsername : step === 2 ? handleVerifyOtp : step === 3 ? handleSetupPassword : handleLoginWithPassword}>
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  <span>{error}</span>
                </div>
              )}

              {step === 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username / Roll No</label>
                  <div className="flex rounded-xl shadow-sm border border-slate-300 focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white overflow-hidden">
                    <input
                      type="text"
                      required
                      value={email.split('@')[0]}
                      onChange={(e) => setEmail(e.target.value.split('@')[0])}
                      className="flex-1 block w-full px-3 py-2.5 sm:text-sm border-0 focus:ring-0 text-slate-900 bg-transparent"
                      disabled={isLoading}
                    />
                    <div className="flex items-center px-3 bg-slate-50 border-l border-slate-300 text-slate-500 sm:text-sm">
                      @nitt.edu
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">OTP Verification</label>
                  <p className="text-xs text-slate-500 mb-3">An OTP has been sent to <strong>{formatEmail(email)}</strong></p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full px-3 py-3 text-center tracking-widest text-lg font-mono border border-slate-300 rounded-xl shadow-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                    placeholder="000000"
                    disabled={isLoading}
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 sm:text-sm border border-slate-300 rounded-xl shadow-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500 mt-2">Password must be at least 8 characters long.</p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="mb-4 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 flex justify-between items-center">
                    <span>Signed in as: <strong className="text-slate-800">{formatEmail(email)}</strong></span>
                    <button type="button" onClick={() => { setStep(1); setPassword(''); }} className="text-blue-700 hover:underline">Change</button>
                  </div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 sm:text-sm border border-slate-300 rounded-xl shadow-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Processing...' : step === 1 ? 'Next' : step === 2 ? 'Verify OTP' : step === 3 ? 'Set Password' : 'Login'}
                </button>

                {step === 4 && (
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isLoading}
                      className="text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                      Reset Password via OTP / Forgot Password?
                    </button>
                  </div>
                )}
              </div>
              
              {step > 1 && (
                <div className="text-center mt-2">
                  <button 
                    type="button" 
                    onClick={() => { setStep(1); setError(''); setPassword(''); setOtp(''); }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  >
                    Back to Username Entry
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-4 px-6 text-center text-xs relative z-10">
        <p>&copy; {new Date().getFullYear()} National Institute of Technology, Tiruchirappalli. All rights reserved.</p>
      </footer>
    </div>
  );
}
