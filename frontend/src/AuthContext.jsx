import { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await authService.getProfile();
            if (res.success) {
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error("Auth verification failed:", error);
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
        const res = await authService.verifyOtp(email, otp);
        if (res.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        return res;
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.removeItem('user'); // wipe local user metadata
            setUser(null);
        }
    };

    const contextValue = useMemo(
        () => ({ user, loading, requestOtp, verifyOtp, logout, fetchUser }),
        [user, loading]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);