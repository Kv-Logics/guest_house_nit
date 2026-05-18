import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessPage() {
  const location = useLocation();
  const bookingId = location.state?.bookingId || 'ID Missing';

  return (
    <div className="max-w-lg mx-auto mt-16 p-10 bg-white rounded-3xl shadow-sm text-center border border-slate-200">
      <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-8 shadow-inner border border-green-50">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">
        Application Submitted Successfully
      </h2>
      <p className="text-slate-500 mb-10 text-base px-2">
        Your accommodation request has been successfully submitted and routed to the approval authority. You can track its live stage progress on your dashboard.
      </p>

      <div className="bg-slate-50/80 rounded-2xl p-6 mb-10 border border-slate-200 shadow-sm">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3">
          Reference ID
        </p>
        <p className="font-mono text-xl font-extrabold text-indigo-600 break-all select-all bg-white px-4 py-2 rounded-lg border border-slate-200">
          {bookingId}
        </p>
      </div>

      <Link
        to="/"
        className="inline-block w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-sm"
      >
        Start New Application
      </Link>
    </div>
  );
}
