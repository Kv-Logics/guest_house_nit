import React, { useEffect } from 'react';
import nitLogo from '../../assets/images/nitlogo.png';
import nitBg from '../../assets/images/NitImgBg.jpeg';

export default function LoginPage() {
  useEffect(() => {
    // Redirect unauthorized users to Central SSO Auth Service
    window.location.href = 'http://localhost:5000/api/v1/auth/authorize?redirectTo=http://localhost:3000/auth/callback';
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${nitBg})` }}
    >
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px]"></div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <img src={nitLogo} alt="NIT Logo" className="w-24 h-24 mx-auto object-contain drop-shadow-lg" />
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          NITT Guest House
        </h2>
        <p className="mt-2 text-center text-sm text-slate-200 drop-shadow-sm">Sign in to your account</p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-bold">Redirecting to Central NITT Auth Service...</p>
          <p className="text-xs text-slate-400 mt-2">Please wait a moment while we establish a secure connection.</p>
          
          <button
            onClick={() => {
              window.location.href = 'http://localhost:5000/api/v1/auth/authorize?redirectTo=http://localhost:3000/auth/callback';
            }}
            className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all"
          >
            Click here if not redirected
          </button>
        </div>
      </div>
    </div>
  );
}
