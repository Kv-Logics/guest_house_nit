import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const errorMessage = location.state?.message || 'The backend refused the connection or a fatal error occurred.';

  return (
    <div className="max-w-lg mx-auto mt-16 p-10 bg-white rounded-3xl shadow-sm border border-slate-200">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-10 rounded-r-2xl shadow-sm flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-red-800 mb-2">System Rejection</h3>
          <p className="text-sm font-medium text-red-700/80 leading-relaxed">{errorMessage}</p>
        </div>
      </div>
      
      <button onClick={() => navigate(-1)} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-sm flex justify-center items-center">
        <ArrowLeft className="w-5 h-5 mr-2" /> Go Back & Fix Form
      </button>
    </div>
  );
}