import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.data);
        // Only fetch system config once we know the session is valid
        authService.getSystemConfig().then(cfgRes => {
          if (cfgRes && cfgRes.success) {
            localStorage.setItem('sys-config', JSON.stringify(cfgRes.data));
            window.dispatchEvent(new Event('sys-config-updated'));
          }
        }).catch(() => {}); // Silently ignore — not critical
      } else {
        setUser(null);
      }
    } catch {
      // 401 just means no active session — not a real error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const requestOtp = async (email) => {
    return await authService.requestOtp(email);
  };

  const verifyOtp = async (email, otp) => {
    try {
      const res = await authService.verifyOtp(email, otp);
      if (res.success) {
        await fetchUser(); // cookie is set by backend, just fetch the user
      }
      return res;
    } catch (err) {
      // interceptor rejects with { success: false, message } shaped object
      return {
        success: false,
        message: err?.message || 'Incorrect OTP. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token'); // cleanup in case any legacy token exists
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
