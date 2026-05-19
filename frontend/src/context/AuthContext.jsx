import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch {
      // 401 just means no active session — not a real error
      setUser(null);
      localStorage.removeItem('user');
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
      localStorage.removeItem('user');  // wipe local user metadata
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
