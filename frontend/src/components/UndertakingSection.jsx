import { ShieldCheck } from 'lucide-react';

export default function UndertakingSection({ formData, handleChange }) {
  
  const allChecked = formData.undertaking_1 && formData.undertaking_2 && formData.undertaking_3 && formData.undertaking_4 && formData.undertaking_5;

  return (
    <div className={`p-6 rounded-3xl border-2 transition-all duration-300 ${allChecked ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
      <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center mb-5">
        <ShieldCheck className={`w-6 h-6 mr-2 ${allChecked ? 'text-emerald-500' : 'text-slate-400'}`} />
        Undertaking by Applicant
      </h3>
      
      <div className="space-y-4">
        {[
          { id: '1', text: "The visit strictly relates to the official / personal activities as declared above." },
          { id: '2', text: "I accept full payment responsibility for the accommodation charges incurred." },
          { id: '3', text: "I guarantee the proper conduct of the guest(s) during their stay at the facility." },
          { id: '4', text: "I agree to ensure the guest vacates the room immediately after the sanctioned period." },
          { id: '5', text: "I hereby confirm and accept all current NITT Guest House terms and conditions." }
        ].map((item) => (
          <label key={item.id} className="flex items-start cursor-pointer group">
            <div className="flex items-center h-5 mt-0.5">
              <input required type="checkbox" name={`undertaking_${item.id}`} checked={formData[`undertaking_${item.id}`]} onChange={handleChange} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer" />
            </div>
            <div className="ml-3 text-sm">
              <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors select-none">{item.text} <span className="text-red-400">*</span></span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}