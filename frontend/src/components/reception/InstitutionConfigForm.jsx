import React, { useState, useEffect } from 'react';
import { Save, Settings, FileText, CheckCircle } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const InstitutionConfigForm = () => {
    const [config, setConfig] = useState({
        legal_name: '',
        gstin: '',
        pan: '',
        address: '',
        signatory_name: '',
        signatory_designation: '',
        invoice_prefix: '',
        sac_code: '',
        financial_year: '25-26'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getInstitutionConfig();
            if (res.success && res.data) {
                setConfig(res.data);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load configuration' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);
            const res = await receptionService.updateInstitutionConfig(config);
            if (res.success) {
                setConfig(res.data);
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <Settings className="h-8 w-8 text-gray-700 mr-3" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Billing Configuration</h2>
                    <p className="text-gray-500">Manage static details used for generating tax invoices.</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 mb-6 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700">Invoice Headers & Taxation</h3>
                </div>
                <form onSubmit={handleSave} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Entity Name</label>
                            <input type="text" name="legal_name" value={config.legal_name || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                            <input type="text" name="gstin" value={config.gstin || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                            <input type="text" name="pan" value={config.pan || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SAC Code (Services)</label>
                            <input type="text" name="sac_code" value={config.sac_code || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
                            <textarea name="address" rows="2" value={config.address || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pt-6 border-t">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                            <input type="text" name="invoice_prefix" value={config.invoice_prefix || ''} onChange={handleChange} placeholder="e.g. NITTGH/" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50 font-mono" />
                            <p className="text-xs text-gray-500 mt-1">
                                <strong>Preview:</strong> {config.invoice_prefix || 'PREFIX/'}25-26/CAT-I/00001
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                            <input type="text" name="financial_year" value={config.financial_year || ''} onChange={handleChange} placeholder="e.g. 25-26" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50 font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                            <input type="text" name="signatory_name" value={config.signatory_name || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Designation</label>
                            <input type="text" name="signatory_designation" value={config.signatory_designation || ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors disabled:opacity-50">
                            {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Configuration</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InstitutionConfigForm;
