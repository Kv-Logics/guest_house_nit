import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const processLogin = async () => {
      const email = searchParams.get('email');
      const name = searchParams.get('name');
      const role = searchParams.get('role');
      const dept = searchParams.get('dept');

      if (email) {
        hasProcessed.current = true;

        // Store this metadata object as a string inside localStorage under the key 'user'
        const userMetadata = { email, name, role, dept };
        localStorage.setItem('user', JSON.stringify(userMetadata));

        // IMPORTANT: Update the Auth state before navigating
        await fetchUser();

        // Redirect cleanly to '/dashboard'
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };

    processLogin();
  }, [searchParams, navigate, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 font-medium">Finalizing NITT Authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
