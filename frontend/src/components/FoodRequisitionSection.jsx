import { Utensils, Plus, Trash2, Coffee } from 'lucide-react';

export default function FoodRequisitionSection({ formData, setFormData }) {
  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      food_requests: [...(prev.food_requests || []), { date: '', breakfast: 0, lunch: 0, dinner: 0, remarks: '' }]
    }));
  };

  const removeRow = (index) => {
    setFormData(prev => ({
      ...prev,
      food_requests: prev.food_requests.filter((_, i) => i !== index)
    }));
  };

  const updateRow = (index, field, value) => {
    setFormData(prev => {
      const newRequests = [...(prev.food_requests || [])];
      newRequests[index][field] = value;
      return { ...prev, food_requests: newRequests };
    });
  };

  const requests = formData.food_requests || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-orange-100">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Food Requisition</h3>
            <p className="text-sm text-slate-500 font-medium">Optional dining requirements (payable locally)</p>
          </div>
        </div>
        <button type="button" onClick={addRow} className="flex items-center text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors border border-orange-200">
          <Plus className="w-4 h-4 mr-1.5" /> Add Day
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
          <Coffee className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="font-medium">No food requested. Guests can arrange meals locally.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-bold w-40">Date</th>
                <th className="p-4 font-bold w-24">Breakfast</th>
                <th className="p-4 font-bold w-24">Lunch</th>
                <th className="p-4 font-bold w-24">Dinner</th>
                <th className="p-4 font-bold">Remarks (Veg/Non-Veg)</th>
                <th className="p-4 font-bold w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3"><input type="date" value={req.date} onChange={(e) => updateRow(index, 'date', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" required /></td>
                  <td className="p-3"><input type="number" min="0" value={req.breakfast} onChange={(e) => updateRow(index, 'breakfast', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:ring-2 focus:ring-orange-500 outline-none" /></td>
                  <td className="p-3"><input type="number" min="0" value={req.lunch} onChange={(e) => updateRow(index, 'lunch', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:ring-2 focus:ring-orange-500 outline-none" /></td>
                  <td className="p-3"><input type="number" min="0" value={req.dinner} onChange={(e) => updateRow(index, 'dinner', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:ring-2 focus:ring-orange-500 outline-none" /></td>
                  <td className="p-3"><input type="text" value={req.remarks} onChange={(e) => updateRow(index, 'remarks', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Preferences" /></td>
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => removeRow(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}