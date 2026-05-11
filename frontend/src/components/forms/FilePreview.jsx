import { useState, useEffect } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';

export default function FilePreview({ file, onRemove }) {
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
        <span className="text-xs font-bold text-indigo-700 truncate pr-4 flex items-center">
          <Paperclip className="w-4 h-4 mr-1.5 flex-shrink-0" />{' '}
          <span className="truncate">{file.name}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-slate-100 hover:border-red-100 shadow-sm" title="Remove file">
            <Trash2 className="w-4 h-4" />
          </button>
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
}