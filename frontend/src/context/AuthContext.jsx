import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await authService.getProfile();
            if (res.success) {
                setUser(res.data);
            }
        } catch (error) {
            console.error("Auth verification failed:", error);
            localStorage.removeItem('token');
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
        const res = await authService.verifyOtp(email, otp);
        if (res.success) {
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
        }
        return res;
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.removeItem('token');
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