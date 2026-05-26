import { useState, useEffect } from 'react';
import { ClipboardList, Tag, Briefcase, FileText, Info, X } from 'lucide-react';
import CategoryInfoModal from './CategoryInfoModal';

// MAIN COMPONENT EXPORT
export default function CategoryVisitSection({ formData, handleChange, setFormData }) {
  const [showCatInfo, setShowCatInfo] = useState(false);

  // Cat-1 and Cat-2 are always official — lock visit_type automatically
  useEffect(() => {
    if ((formData.category_id === '1' || formData.category_id === '2') && formData.visit_type !== 'official') {
      setFormData(prev => ({ ...prev, visit_type: 'official' }));
    }
  }, [formData.category_id]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Category Proposed</h3>
            <p className="text-sm text-slate-500 font-medium">Determine billing responsibilities & rules</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowCatInfo(!showCatInfo)} className="flex items-center justify-center text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors border border-indigo-200 shadow-sm whitespace-nowrap">
          <Info className="w-4 h-4 mr-1.5" /> {showCatInfo ? 'Hide Details' : 'Category Details'}
        </button>
      </div>

      <CategoryInfoModal show={showCatInfo} onClose={() => setShowCatInfo(false)} />

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Purpose of Visit <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <FileText className="absolute top-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <textarea
            required
            minLength={5}
            name="purpose_of_visit"
            value={formData.purpose_of_visit}
            onChange={handleChange}
            rows="2"
            className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
            placeholder="Brief description of the visit's nature"
          ></textarea>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Requested Category</label>
          <Tag className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
          >
            <option value="1">CAT I</option>
            <option value="2">CAT II</option>
            <option value="3">CAT III</option>
            <option value="4">CAT IV</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Visit Type</label>
          <Briefcase className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            name="visit_type"
            value={formData.visit_type}
            onChange={handleChange}
            className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
          >
            <option value="official">Official</option>
            {(formData.category_id !== '1' && formData.category_id !== '2') && (
              <option value="personal">Personal</option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      {formData.category_id === '2' && (
        <div className="mb-6 animate-fade-in transition-all duration-300 bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-blue-900 mb-2">
              Payment Responsibility
            </label>
            <select
              name="payment_responsibility"
              value={formData.payment_responsibility}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            >
              <option value="guest">Guest</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>
        </div>
      )}

      {(formData.category_id === '3' || formData.category_id === '4' || (formData.category_id === '2' && formData.payment_responsibility === 'guest')) && (
        <div className="mb-6 bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm font-semibold text-amber-800 flex items-start">
          <Info className="w-5 h-5 flex-shrink-0 mr-2 text-amber-600" />
          <div>
            Bill must be settled before checkout.
          </div>
        </div>
      )}
    </div>
  );
}
