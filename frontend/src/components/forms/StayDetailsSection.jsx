import { UploadCloud, CalendarClock, DoorOpen, ArrowUp, ArrowDown, Move, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
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

  const getInitialPriorities = () => {
    const defaultTypes = ['Standard Room', 'Mini Suite Room'];
    if (!formData.room_priority) return defaultTypes;
    
    const parsed = formData.room_priority
      .split(' > ')
      .map(s => s.trim())
      .filter(s => ['Standard Room', 'Mini Suite Room', 'Suite Room'].includes(s));
      
    return parsed.length > 0 ? parsed : defaultTypes;
  };

  const priorities = getInitialPriorities();

  // Ensure room_priority is initialized (Suite Room is NOT included by default)
  useEffect(() => {
    if (!formData.room_priority) {
      setFormData(prev => ({
        ...prev,
        room_priority: 'Standard Room > Mini Suite Room',
        room_type: prev.room_type || 'Standard Room'
      }));
    }
  }, [formData.room_priority, setFormData]);

  const handleMove = (index, direction) => {
    const newPriorities = [...priorities];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPriorities.length) return;
    
    // Swap
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[targetIndex];
    newPriorities[targetIndex] = temp;
    
    const priorityStr = newPriorities.join(' > ');
    setFormData(prev => ({
      ...prev,
      room_priority: priorityStr,
      room_type: newPriorities[0] // Set highest preference as primary
    }));
  };

  const handleAddSuite = () => {
    if (priorities.includes('Suite Room')) return;
    const newPriorities = [...priorities, 'Suite Room'];
    const priorityStr = newPriorities.join(' > ');
    setFormData(prev => ({
      ...prev,
      room_priority: priorityStr,
      room_type: newPriorities[0]
    }));
  };

  const handleRemoveSuite = () => {
    const newPriorities = priorities.filter(t => t !== 'Suite Room');
    const priorityStr = newPriorities.join(' > ');
    setFormData(prev => ({
      ...prev,
      room_priority: priorityStr,
      room_type: newPriorities[0] || 'Standard Room'
    }));
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">Room Type Priority Order <span className="text-red-500">*</span></label>
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm">
            {priorities.map((roomType, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === priorities.length - 1;
              
              return (
                <div
                  key={roomType}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 shadow-sm ${
                    isFirst 
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900 ring-1 ring-blue-100' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                      isFirst 
                        ? 'bg-blue-200 text-blue-800' 
                        : idx === 1 
                          ? 'bg-slate-200 text-slate-700' 
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm tracking-tight">{roomType}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                        isFirst ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {idx === 0 ? 'Highest Preference' : idx === 1 ? 'Second Choice' : 'Third Choice'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {roomType === 'Suite Room' && (
                      <button
                        type="button"
                        onClick={handleRemoveSuite}
                        className="p-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 bg-white hover:border-red-200 shadow-sm transition-all mr-1"
                        title="Remove Suite Room from Preferences"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, -1)}
                      className={`p-2 rounded-lg border transition-all ${
                        isFirst 
                          ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50' 
                          : 'text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 bg-white shadow-sm'
                      }`}
                      title="Move Preference Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, 1)}
                      className={`p-2 rounded-lg border transition-all ${
                        isLast 
                          ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50' 
                          : 'text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 bg-white shadow-sm'
                      }`}
                      title="Move Preference Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!priorities.includes('Suite Room') && (
            <div className="mt-3 flex justify-start">
              <button
                type="button"
                onClick={handleAddSuite}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-sm animate-fade-in"
              >
                <Plus className="w-4 h-4" /> Add Suite Room to Preferences
              </button>
            </div>
          )}
          {priorities.includes('Suite Room') && (
            <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl text-amber-950 text-xs font-medium shadow-sm animate-fade-in flex items-start gap-3">
              <span className="text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px] mb-1">HOD Review & Director Approval Required</p>
                <p className="leading-relaxed">Choosing a <strong>Suite Room</strong> in your preferences initiates an advanced approval workflow. Your Departmental Authority (HOD / Dean) must first review and endorse the booking, after which it will automatically route to the <strong>Director</strong> for final executive authorization.</p>
              </div>
            </div>
          )}
          <p className="text-xs font-semibold text-slate-500 mt-3">
            * Rank your preferred room choices. Reception will allocate alternatives in this exact order if your first choice is unavailable.
          </p>
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
