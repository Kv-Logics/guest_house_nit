import { UploadCloud, CalendarClock, DoorOpen } from 'lucide-react';
import FilePreview from './FilePreview';

export default function StayDetailsSection({ formData, handleChange, setFormData, tariffs = [] }) {
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

  const currentCategoryId = formData.category_id || '1';
  const availableTariffs = tariffs.filter(t => String(t.category_id) === String(currentCategoryId));

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            Accommodation & Documents
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Select rooms and attach supporting files
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Room Type</label>
          <DoorOpen className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            name="room_type"
            value={formData.room_type || 'Standard Room'}
            onChange={handleChange}
            className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
          >
            {availableTariffs.length > 0 ? (
              availableTariffs.map((t) => (
                <option key={t.tariff_id} value={t.room_type}>
                  {t.room_type} (₹{Number(t.single_occupancy)} Single / ₹{Number(t.double_occupancy)} Double)
                </option>
              ))
            ) : (
              <>
                <option value="Standard Room">Standard Room</option>
                <option value="Mini Suite Room">Mini Suite Room</option>
                <option value="Suite Room">Suite Room</option>
              </>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Document Uploads */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
          <UploadCloud className="w-5 h-5 mr-2 text-indigo-500" /> Supporting Documents
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Primary Document (PDF/PNG, Max 5MB) <span className="text-red-500">*</span>
            </label>
            {!formData.document_1 ? (
              <input
                required
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
                Additional Document (PDF/PNG, Max 5MB) <span className="text-red-500">*</span>
              </label>
              {!formData.document_2 ? (
                <input
                  required
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
