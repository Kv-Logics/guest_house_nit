import { useState, useEffect } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function FilePreview({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (file && file.file_path) {
      const serverUrl = `${API_BASE_URL.replace('/api', '')}/${file.file_path.replace(/\\/g, '/')}`;
      setPreviewUrl(serverUrl);
    }
  }, [file]);

  if (!file) return null;

  const isServerFile = file && !file.type && file.file_path;
  const fileName = isServerFile ? file.file_name : file.name;
  const fileSizeStr = isServerFile 
    ? `${(Number(file.file_size_bytes) / 1024 / 1024).toFixed(2)} MB` 
    : `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  const mimeType = isServerFile ? file.mime_type : file.type;

  return (
    <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <span className="text-xs font-bold text-indigo-700 truncate pr-4 flex items-center">
          <Paperclip className="w-4 h-4 mr-1.5 flex-shrink-0" />{' '}
          <span className="truncate">{fileName}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
            {fileSizeStr}
          </span>
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-650 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-slate-100 hover:border-red-100 shadow-sm" title="Remove file">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden relative">
        {mimeType === 'application/pdf' ? (
          <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-40 border-0" title="PDF Preview" />
        ) : (
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-contain" />
        )}
      </div>
    </div>
  );
}