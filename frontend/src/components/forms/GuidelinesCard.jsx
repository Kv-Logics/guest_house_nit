import { FileText } from 'lucide-react';

export default function GuidelinesCard({ guidelinesAccepted, setGuidelinesAccepted }) {
  return (
    <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${guidelinesAccepted ? 'bg-emerald-50 border-emerald-500/30' : 'bg-amber-50 border-amber-400 shadow-md shadow-amber-100/50'}`}>
      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
        <FileText className={`w-5 h-5 mr-2 ${guidelinesAccepted ? 'text-emerald-500' : 'text-amber-500'}`} />
        Official NITT Guest House Guidelines
      </h3>
      <div className="text-sm text-slate-700 space-y-3 mb-5 bg-white/60 p-4 rounded-xl">
        <p><strong>Category I:</strong> Institute Guests, Ministry Officials, VIPs. <em className="text-slate-500">(Payment by Institute)</em></p>
        <p><strong>Category II:</strong> Official project visitors, examiners, external experts. <em className="text-slate-500">(Project code strictly required)</em></p>
        <p><strong>Category III:</strong> NITT Faculty/Staff/Students booking for parents or personal guests. <em className="text-slate-500">(Payment by Guest or Faculty)</em></p>
        <p><strong>Category IV:</strong> Alumni and external individuals. <em className="text-slate-500">(Subject to extreme availability)</em></p>
      </div>
      <label className="flex items-start sm:items-center cursor-pointer group">
        <input type="checkbox" checked={guidelinesAccepted} onChange={(e) => setGuidelinesAccepted(e.target.checked)} className="w-5 h-5 mt-0.5 sm:mt-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer" />
        <span className={`ml-3 font-bold transition-colors select-none ${guidelinesAccepted ? 'text-emerald-800' : 'text-amber-900 group-hover:text-amber-700'}`}>
          I have reviewed and understood the official guidelines. Proceed to application.
        </span>
      </label>
    </div>
  );
}