import React, { useState } from 'react';
import { X, Building2, User } from 'lucide-react';

export default function BillingInfoModal({ isOpen, onClose, onConfirm, guestName, roomNumber }) {
    const [billingType, setBillingType] = useState('B2C');
    const [companyName, setCompanyName] = useState('');
    const [gstin, setGstin] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in animate-scale-up">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Confirm Check-Out</h2>
                        <p className="text-indigo-100 text-xs">
                            Guest: {guestName} • Room: {roomNumber}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-indigo-100 hover:text-white p-1 rounded-lg hover:bg-indigo-500/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onConfirm({
                        billing_type: billingType,
                        company_name: billingType === 'B2B' ? companyName : null,
                        gstin: billingType === 'B2B' ? gstin : null,
                        company_address: billingType === 'B2B' ? companyAddress : null
                    });
                }}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Billing Type</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBillingType('B2C')}
                                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${billingType === 'B2C' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    <User className="w-4 h-4" /> B2C (Personal)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingType('B2B')}
                                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${billingType === 'B2B' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    <Building2 className="w-4 h-4" /> B2B (Corporate)
                                </button>
                            </div>
                        </div>

                        {billingType === 'B2B' && (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Enter company name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">GSTIN</label>
                                    <input 
                                        type="text" 
                                        value={gstin}
                                        onChange={(e) => setGstin(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                        placeholder="Enter GSTIN"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Address</label>
                                    <textarea 
                                        value={companyAddress}
                                        onChange={(e) => setCompanyAddress(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Enter company address"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                            Confirm Check-Out
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
