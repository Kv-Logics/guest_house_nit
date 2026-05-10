import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true, // Crucial for HttpOnly cookies
});

// Inject JWT Access Token into every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Standardize Responses & Handle Automatic Token Refresh
api.interceptors.response.use(
    (response) => response.data, // Automatically strip Axios envelope to match Backend format
    async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized, and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt to refresh the token using HttpOnly cookie/backend endpoint
                const res = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                
                if (res.data?.success && res.data?.data?.token) {
                    const newToken = res.data.data.token;
                    localStorage.setItem('token', newToken);
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return api(originalRequest); // Retry original request
                }
            } catch (refreshError) {
                localStorage.removeItem('token');
                window.location.href = '/login'; // Refresh completely failed, force re-auth
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error.response?.data || { success: false, message: error.message });
    }
);

export default api;