import { UploadCloud, CalendarClock, BedDouble, Info, X } from 'lucide-react';
import { useState } from 'react';
import FilePreview from './FilePreview';

// ──────────────────────────────────────────
// Inline Tariff Preview Modal
// ──────────────────────────────────────────
function TariffInfoModal({ show, onClose, tariffs }) {
  if (!show) return null;

  const categories = [
    { id: '1', name: 'Category I (Institute Paid)' },
    { id: '2', name: 'Category II (Project / Coordinator / Guest Paid)' },
    { id: '3', name: 'Category III (Personal - Guest / Faculty Paid)' }
  ];

  return (
    <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg relative animate-fade-in overflow-hidden z-20">
      <div className="flex justify-between items-center bg-indigo-50/50 p-4 border-b border-indigo-100">
        <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-indigo-500" /> Complete Tariff Details (Category I, II &amp; III)
        </h4>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
        {categories.map(cat => {
          const rows = tariffs.filter(t => String(t.category_id) === String(cat.id));
          if (rows.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-2">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider pl-1">{cat.name}</h5>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Room Type</th>
                      <th className="px-4 py-2.5">Single (₹/day)</th>
                      <th className="px-4 py-2.5">Double (₹/day)</th>
                      <th className="px-4 py-2.5">Extra Bed (₹/day)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{t.room_type}</td>
                        <td className="px-4 py-2.5 text-slate-700">₹{Number(t.single_occupancy).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-slate-700">₹{Number(t.double_occupancy).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-slate-700">₹{Number(t.extra_bed || 400).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-400 font-medium mt-2">
          * Rates shown are per calendar day (midnight to midnight). GST of 12% will be added to the final bill.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────
export default function StayDetailsSection({ formData, handleChange, setFormData, tariffs = [] }) {
  const [showTariff, setShowTariff] = useState(false);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        e.target.value = '';
        setFormData((prev) => ({ ...prev, [field]: null }));
        return;
      }
      if (!['application/pdf', 'image/png'].includes(file.type)) {
        alert('Only PDF and PNG files are allowed.');
        e.target.value = '';
        setFormData((prev) => ({ ...prev, [field]: null }));
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: file }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: null }));
    }
  };

  const isSuiteRoom = formData.room_type === 'Suite Room' || formData.room_type === 'Mini Suite Room';
  const currentCategoryId = formData.category_id || '1';

  return (
    <div>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Accommodation &amp; Documents
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Select room type and attach supporting files
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTariff(!showTariff)}
          className="flex items-center justify-center text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors border border-indigo-200 shadow-sm whitespace-nowrap"
        >
          <Info className="w-4 h-4 mr-1.5" /> {showTariff ? 'Hide Tariff' : 'View Tariff'}
        </button>
      </div>

      <TariffInfoModal
        show={showTariff}
        onClose={() => setShowTariff(false)}
        tariffs={tariffs}
      />

      {/* Room Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Room Type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <BedDouble className="absolute top-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            name="room_type"
            value={formData.room_type || 'Standard Room'}
            onChange={(e) => {
              handleChange(e);
              // keep room_priority in sync (backend fallback)
              setFormData(prev => ({ ...prev, room_type: e.target.value, room_priority: e.target.value }));
            }}
            className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer font-semibold"
          >
            <option value="Standard Room">Standard Room</option>
            <option value="Mini Suite Room">Mini Suite Room</option>
            <option value="Suite Room">Suite Room</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Suite Room warning */}
        {isSuiteRoom && (
          <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl text-amber-950 text-xs font-medium shadow-sm animate-fade-in flex items-start gap-3">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div>
              <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px] mb-1">HOD Review &amp; Director Approval Required</p>
              <p className="leading-relaxed">Choosing a <strong>Suite / Mini Suite Room</strong> initiates an advanced 5-stage approval workflow. Your Departmental Authority (HOD / Dean) must first endorse the booking, after which it will automatically route to the <strong>Director</strong> for executive authorization before reaching Admin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tariff estimate warning */}
      <div className="mb-6 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-medium text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
        <span>Estimated cost is calculated on current tariff rates (per calendar day) + 12% GST. Final billing may vary based on actual room allocation and occupancy.</span>
      </div>

      {/* Document Uploads */}
      <div className="pt-6 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
          <UploadCloud className="w-5 h-5 mr-2 text-indigo-500" /> Supporting Documents
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Primary Document (PDF/PNG, Max 5MB) <span className="text-slate-400 font-normal ml-1">(Optional)</span>
            </label>
            {!formData.document_1 ? (
              <input
                type="file"
                accept=".pdf, .png"
                onChange={(e) => handleFileChange(e, 'document_1')}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl p-1.5 bg-slate-50/50 cursor-pointer"
              />
            ) : (
              <FilePreview
                file={formData.document_1}
                onRemove={() => setFormData((prev) => ({ ...prev, document_1: null }))}
              />
            )}
          </div>
          {formData.category_id === '1' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Additional Document (PDF/PNG, Max 5MB) <span className="text-slate-400 font-normal ml-1">(Optional)</span>
              </label>
              {!formData.document_2 ? (
                <input
                  type="file"
                  accept=".pdf, .png"
                  onChange={(e) => handleFileChange(e, 'document_2')}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl p-1.5 bg-slate-50/50 cursor-pointer"
                />
              ) : (
                <FilePreview
                  file={formData.document_2}
                  onRemove={() => setFormData((prev) => ({ ...prev, document_2: null }))}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
