import React, { useState, useEffect } from 'react';
import { Save, Mail, CheckCircle, Eye, EyeOff, Send, Loader2, AlertCircle } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const SMTPSettingsForm = () => {
    const [settings, setSettings] = useState({
        smtp_host: '',
        smtp_port: '587',
        smtp_username: '',
        smtp_password: '',
        smtp_secure: 'tls' // 'tls' or 'ssl'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const [recipientEmail, setRecipientEmail] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getSystemSettings();
            if (res.success && res.data) {
                // Pre-populate with retrieved settings, keeping default fallbacks if empty
                setSettings({
                    smtp_host: res.data.smtp_host || '',
                    smtp_port: res.data.smtp_port || '587',
                    smtp_username: res.data.smtp_username || '',
                    smtp_password: res.data.smtp_password || '',
                    smtp_secure: res.data.smtp_secure || 'tls'
                });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load SMTP configuration' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);
            const res = await receptionService.updateSystemSettings(settings);
            if (res.success) {
                setMessage({ type: 'success', text: 'SMTP Settings saved successfully!' });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save SMTP settings' });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handleTestSMTP = async () => {
        if (!recipientEmail) return;
        try {
            setTesting(true);
            setTestResult(null);
            const res = await receptionService.testSMTP(recipientEmail);
            if (res.success) {
                setTestResult({
                    type: 'success',
                    text: 'The test email was dispatched successfully. Please check the recipient\'s inbox.'
                });
            } else {
                setTestResult({
                    type: 'error',
                    text: res.message || 'SMTP test failed.'
                });
            }
        } catch (err) {
            setTestResult({
                type: 'error',
                text: err.response?.data?.message || err.message || 'An error occurred while testing SMTP settings.'
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div></div>;

    return (
        <div className="py-2 px-4 w-full">
            <div className="flex items-center mb-6">
                <Mail className="h-8 w-8 text-gray-700 mr-3" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">SMTP Configuration</h2>
                    <p className="text-gray-500">Configure the outgoing mail server for dynamic email alerts and stage notifications.</p>
                </div>
            </div>

            {message && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 shadow-lg rounded-full flex items-center animate-fade-in ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {message.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                    <SettingsFormIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700">SMTP Outgoing Server Details</h3>
                </div>
                <form onSubmit={handleSave} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host Server</label>
                            <input 
                                type="text" 
                                required
                                name="smtp_host" 
                                value={settings.smtp_host} 
                                onChange={handleChange} 
                                placeholder="e.g. smtp.gmail.com" 
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                            <input 
                                type="number" 
                                required
                                name="smtp_port" 
                                value={settings.smtp_port} 
                                onChange={handleChange} 
                                placeholder="e.g. 587 or 465" 
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email Address</label>
                            <input 
                                type="email" 
                                required
                                name="smtp_username" 
                                value={settings.smtp_username} 
                                onChange={handleChange} 
                                placeholder="e.g. guesthouse@nitt.edu" 
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password / App Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    name="smtp_password" 
                                    value={settings.smtp_password} 
                                    onChange={handleChange} 
                                    placeholder="••••••••••••" 
                                    className="w-full border rounded-lg pl-4 pr-10 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Connection Security</label>
                            <select 
                                name="smtp_secure" 
                                value={settings.smtp_secure} 
                                onChange={handleChange} 
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                            >
                                <option value="tls">STARTTLS / TLS (Typically Port 587)</option>
                                <option value="ssl">SSL (Typically Port 465)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t mt-8">
                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save SMTP Settings</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Test Connection Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                    <Send className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700">Test SMTP Connection</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4 font-medium">
                        Send a test email to verify that the SMTP settings configured above are correct and the server can dispatch mail. Note: Make sure to save any changes before running the test.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email Address</label>
                            <input 
                                type="email" 
                                value={recipientEmail} 
                                onChange={(e) => setRecipientEmail(e.target.value)} 
                                placeholder="recipient@example.com" 
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleTestSMTP}
                            disabled={testing || !recipientEmail}
                            className="flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 h-10 shrink-0 shadow-sm"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Test Email
                                </>
                            )}
                        </button>
                    </div>

                    {testResult && (
                        <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
                            testResult.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-250 text-red-800'
                        }`}>
                            {testResult.type === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className="font-bold text-sm">
                                    {testResult.type === 'success' ? 'Connection Successful!' : 'Connection Failed'}
                                </p>
                                <p className="text-xs mt-1 font-medium leading-relaxed">
                                    {testResult.text}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Simple settings icon component
const SettingsFormIcon = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export default SMTPSettingsForm;
