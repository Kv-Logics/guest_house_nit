import { useState, useEffect } from 'react';
import { ClipboardList, Tag, Briefcase, FileText, Info, X, UploadCloud, Paperclip, Trash2 } from 'lucide-react';

const FilePreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url); // Clean up memory on unmount
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

export default function CategoryVisitSection({ formData, handleChange, setFormData }) {
  const [showCatInfo, setShowCatInfo] = useState(false);

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

      {showCatInfo && (
        <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg relative animate-fade-in overflow-hidden z-20">
          <div className="flex justify-between items-center bg-indigo-50/50 p-4 border-b border-indigo-100">
            <h4 className="font-bold text-indigo-900 text-sm">Category Eligibility & Rules</h4>
            <button type="button" onClick={() => setShowCatInfo(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 border border-slate-200 font-bold whitespace-nowrap">Category</th>
                  <th className="p-3 border border-slate-200 font-bold min-w-[250px]">Eligibility</th>
                  <th className="p-3 border border-slate-200 font-bold min-w-[150px]">Authority</th>
                  <th className="p-3 border border-slate-200 font-bold min-w-[150px]">Payment mode</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr>
                  <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-I</td>
                  <td className="p-3 border border-slate-200 align-top">Guests invited by the Institute for academic, administrative work and for campus interview, other guests whose TA/DA borne by the institute will also come under this category.</td>
                  <td className="p-3 border border-slate-200 align-top">Directors/Deans/Registrar/HODs</td>
                  <td className="p-3 border border-slate-200 align-top">Institute</td>
                </tr>
                <tr className="bg-slate-50/30">
                  <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-II</td>
                  <td className="p-3 border border-slate-200 align-top">Guests/ individuals visiting institute in connection with Scheme, Project/consultancy, short term courses, workshops, symposia, seminars, conferences, etc. having direct relevance to activities of NIT Trichy and where TA/DA is borne by individuals or organizations other than NIT Trichy.</td>
                  <td className="p-3 border border-slate-200 align-top">Deans/HODs</td>
                  <td className="p-3 border border-slate-200 align-top">Project/Respective Co-ordinator/by the guest</td>
                </tr>
                <tr>
                  <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-III</td>
                  <td className="p-3 border border-slate-200 align-top">Employee/Ex-employee, Guests of Faculty/staff, Students’ parents/Guardians and Alumni. Government officials whose visits are not in connection with the work of NIT Trichy and Guests from other academic institutes offered accommodation on reciprocal basis</td>
                  <td className="p-3 border border-slate-200 align-top">Faculty/Staff</td>
                  <td className="p-3 border border-slate-200 align-top">By Individual before checking out/By faculty or staff concerned</td>
                </tr>
                <tr className="bg-slate-50/30">
                  <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-IV</td>
                  <td className="p-3 border border-slate-200 align-top">Guests not covered under above categories</td>
                  <td className="p-3 border border-slate-200 align-top">Registrar/HODs/Faculty</td>
                  <td className="p-3 border border-slate-200 align-top">By Individual before checking out</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">Purpose of Visit <span className="text-red-500">*</span></label>
        <div className="relative">
          <FileText className="absolute top-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <textarea required name="purpose_of_visit" value={formData.purpose_of_visit} onChange={handleChange} rows="2" className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" placeholder="Brief description of the visit's nature"></textarea>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Requested Category</label>
          <Tag className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select name="category_id" value={formData.category_id} onChange={handleChange} className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer">
            <option value="1">CAT I (Institute Guests - Academic/Admin)</option>
            <option value="2">CAT II (Project / Consultancy / Conference)</option>
            <option value="3">CAT III (Staff Guests / Parents / Alumni)</option>
            <option value="4">CAT IV (Personal Uncategorized)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
        </div>
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Visit Type</label>
          <Briefcase className="absolute bottom-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <select name="visit_type" value={formData.visit_type} onChange={handleChange} className="block w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer">
            <option value="official">Official</option>
            <option value="personal">Personal</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 pt-7 text-slate-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
        </div>
      </div>
      
      {formData.category_id === '2' && (
        <div className="mb-6 animate-fade-in transition-all duration-300 bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-blue-900 mb-2">CAT-II Project Code <span className="text-red-500">*</span></label>
              <input required type="text" name="project_code" value={formData.project_code} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" placeholder="e.g., DST-2026" />
              <p className="text-xs font-semibold text-blue-600 mt-2 flex items-center"><Info className="w-3 h-3 mr-1" /> Project code is mandatory for CAT II.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900 mb-2">Payment Responsibility</label>
              <select name="payment_responsibility" value={formData.payment_responsibility} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-blue-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                <option value="guest">Guest</option>
                <option value="coordinator">Coordinator</option>
                <option value="department">Department</option>
                <option value="project">Project Account</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(formData.category_id === '3' || formData.category_id === '4') && (
        <div className="mb-6 bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm font-semibold text-amber-800 flex items-start">
           <Info className="w-5 h-5 flex-shrink-0 mr-2 text-amber-600" />
           <div>
             Bill must be settled before checkout. <br/>
             <span className="font-normal text-xs mt-1 block">Subject to strict room availability. CAT-I & II hold priority override rights.</span>
           </div>
        </div>
      )}

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