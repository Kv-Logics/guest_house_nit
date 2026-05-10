import { BedDouble, UploadCloud, Paperclip, Trash2, CalendarClock } from 'lucide-react';
import { useState, useEffect } from 'react';

const FilePreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!file) return null;
  if (!(file instanceof Blob)) {
    return (
      <div className="text-xs text-red-500 mt-2 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between shadow-sm">
        <span>File data lost during navigation. Please re-upload.</span>
        <button type="button" onClick={onRemove} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-bold transition-colors">Clear</button>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-indigo-700 truncate pr-4 flex items-center"><Paperclip className="w-4 h-4 mr-1.5 flex-shrink-0" /> <span className="truncate">{file.name}</span></span>
        <div className="flex items-center gap-3">
           <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
           <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-slate-100 hover:border-red-100 shadow-sm" title="Remove file"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden relative">
        {file.type === 'application/pdf' ? (
          <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-40 border-0" title="PDF Preview" />
        ) : (
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-contain" />
        )}
      </div>
    </div>
  );
};

export default function StayDetailsSection({ formData, handleChange, setFormData }) {
  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        e.target.value = '';
        setFormData(prev => ({ ...prev, [field]: null }));
        return;
      }
      if (!['application/pdf', 'image/png'].includes(file.type)) {
        alert('Only PDF and PNG files are allowed.');
        e.target.value = '';
        setFormData(prev => ({ ...prev, [field]: null }));
        return;
      }
      setFormData(prev => ({ ...prev, [field]: file }));
    } else {
      setFormData(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Accommodation & Documents</h3>
          <p className="text-sm text-slate-500 font-medium">Select rooms and attach supporting files</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Rooms Required</label>
          <BedDouble className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input required type="number" min="1" name="rooms_required" value={formData.rooms_required} onChange={handleChange} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>

      {/* Document Uploads */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
          <UploadCloud className="w-5 h-5 mr-2 text-indigo-500" /> Supporting Documents
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Primary Document (PDF/PNG, Max 5MB) <span className="text-red-500">*</span></label>
            {!formData.document_1 ? (
              <input required type="file" accept=".pdf, .png" onChange={(e) => handleFileChange(e, 'document_1')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl p-1.5 bg-slate-50/50 cursor-pointer" />
            ) : (
              <FilePreview file={formData.document_1} onRemove={() => setFormData(prev => ({ ...prev, document_1: null }))} />
            )}
          </div>
          {formData.category_id === '1' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-600 mb-2">Additional Document (PDF/PNG, Max 5MB) <span className="text-red-500">*</span></label>
              {!formData.document_2 ? (
                <input required type="file" accept=".pdf, .png" onChange={(e) => handleFileChange(e, 'document_2')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 rounded-xl p-1.5 bg-slate-50/50 cursor-pointer" />
              ) : (
                <FilePreview file={formData.document_2} onRemove={() => setFormData(prev => ({ ...prev, document_2: null }))} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}