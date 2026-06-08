import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const BillOverrideModal = ({ isOpen, onClose, booking, onOverrideComplete }) => {
    const [subtotal, setSubtotal] = useState(0);
    const [gst, setGst] = useState(0);
    const [total, setTotal] = useState(0);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (booking) {
            setSubtotal(booking.subtotal || 0);
            setGst(booking.gst || 0);
            setTotal(booking.total || 0);
            setReason('');
            setError('');
        }
    }, [booking, isOpen]);

    if (!isOpen || !booking) return null;

    // Auto-calculate total if subtotal/gst changes
    const handleSubtotalChange = (val) => {
        setSubtotal(val);
        setTotal((parseFloat(val || 0) + parseFloat(gst || 0)).toFixed(2));
    };

    const handleGstChange = (val) => {
        setGst(val);
        setTotal((parseFloat(subtotal || 0) + parseFloat(val || 0)).toFixed(2));
    };

    const handleSave = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for this manual override.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/billing/${booking.booking_id}/override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subtotal, gst, total, reason })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to override bill');
            
            onOverrideComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">Manual Bill Override</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-bold flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                        <div>Warning: You are manually overriding the system-generated bill for {booking.formatted_id}. This action will be recorded in the audit logs.</div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Subtotal (₹)</label>
                            <input 
                                type="number" 
                                value={subtotal} 
                                onChange={(e) => handleSubtotalChange(e.target.value)}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">GST (₹)</label>
                            <input 
                                type="number" 
                                value={gst} 
                                onChange={(e) => handleGstChange(e.target.value)}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Total (₹)</label>
                            <input 
                                type="number" 
                                value={total} 
                                onChange={(e) => setTotal(e.target.value)}
                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-lg text-slate-800 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Override</label>
                            <textarea 
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g., Tariff calculation error due to room change"
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none h-24 resize-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                        {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Override</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillOverrideModal;
