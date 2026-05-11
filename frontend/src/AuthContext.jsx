import { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const res = await authService.getProfile();
            if (res.success) {
                setUser(res.data);
            }
        } catch (error) {
            console.error("Auth verification failed:", error);
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