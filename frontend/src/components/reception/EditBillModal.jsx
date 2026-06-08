import React, { useState, useEffect } from 'react';
import { Save, X, Edit3 } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const EditBillModal = ({ booking, onClose, onSave }) => {
    const [subtotal, setSubtotal] = useState(0);
    const [gst, setGst] = useState(0);
    const [total, setTotal] = useState(0);
    const [generatedJson, setGeneratedJson] = useState('');
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if (booking) {
            setSubtotal(booking.subtotal || 0);
            setGst(booking.gst || 0);
            setTotal(booking.total || 0);
            setGeneratedJson(JSON.stringify(booking.generated_json || booking.breakdown || {}, null, 2));
        }
    }, [booking]);

    const handleSave = async () => {
        try {
            setSaving(true);
            let parsedJson;
            try {
                parsedJson = JSON.parse(generatedJson);
            } catch (e) {
                alert("Invalid JSON format in the Breakdown field.");
                setSaving(false);
                return;
            }

            const payload = {
                subtotal: parseFloat(subtotal),
                gst: parseFloat(gst),
                total: parseFloat(total),
                generatedJson: parsedJson
            };

            const res = await receptionService.updateBill(booking.booking_id, payload);
            if (res.success) {
                alert("Bill updated successfully!");
                onSave();
            }
        } catch (err) {
            alert('Failed to update bill: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (!booking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-indigo-600" />
                        Edit Bill Parameters
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto font-sans flex-1">
                    <div className="mb-4 text-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <strong>Warning:</strong> You are manually overriding the generated bill. Ensure the total and breakdown JSON are accurate.
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subtotal</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg px-3 py-2"
                                value={subtotal}
                                onChange={(e) => setSubtotal(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">GST</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg px-3 py-2"
                                value={gst}
                                onChange={(e) => setGst(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Total</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg px-3 py-2 font-bold text-indigo-700"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bill Breakdown JSON</label>
                        <textarea 
                            className="w-full border rounded-lg px-3 py-2 font-mono text-xs h-64 custom-scrollbar"
                            value={generatedJson}
                            onChange={(e) => setGeneratedJson(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">This JSON drives the itemized table in the PDF invoice.</p>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 bg-white border rounded-lg font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditBillModal;
