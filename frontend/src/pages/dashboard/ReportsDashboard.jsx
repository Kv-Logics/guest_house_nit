import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, IndianRupee, Printer } from 'lucide-react';
import api from '../../services/api';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

const ReportsDashboard = () => {
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const fetchRevenue = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/reports/revenue?year=${year}&month=${month}`);
            setRevenueData(res.data || []);
        } catch (e) {
            console.error('Error fetching revenue report', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRevenue();
    }, [year, month]);

    const handleExportCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Payment Mode,Invoices Count,Subtotal,CGST (9%),SGST (9%),IGST,Total Revenue\n"
            + revenueData.map(r => `${r.payment_mode},${r.invoice_count},${r.total_subtotal},${r.cgst},${r.sgst},${r.igst},${r.total_amount}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `revenue_report_${year}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handlePrintInvoice = (bookingId) => {
        // Simple client side print routing for invoice
        window.open(`/invoice/${bookingId}`, '_blank');
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center">
                        <BarChart3 className="w-8 h-8 mr-3 text-indigo-600" />
                        Financial Reports
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Monthly revenue, tax breakdown, and GST invoice exports.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50 gap-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <IndianRupee className="w-5 h-5 mr-2 text-emerald-600" />
                        Monthly Revenue Summary
                    </h2>
                    <div className="flex items-center gap-4">
                        <select 
                            value={month} 
                            onChange={(e) => setMonth(e.target.value)}
                            className="p-2 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700"
                        >
                            {Array.from({length: 12}).map((_, i) => (
                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select 
                            value={year} 
                            onChange={(e) => setYear(e.target.value)}
                            className="p-2 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700"
                        >
                            {[...Array(5)].map((_, i) => (
                                <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm flex items-center transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-bold">Loading report data...</div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="p-4 font-bold">Payment Mode</th>
                                    <th className="p-4 font-bold text-center">Invoices</th>
                                    <th className="p-4 font-bold text-right">Subtotal</th>
                                    <th className="p-4 font-bold text-right">CGST (9%)</th>
                                    <th className="p-4 font-bold text-right">SGST (9%)</th>
                                    <th className="p-4 font-bold text-right text-indigo-600">Total Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {revenueData.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No revenue recorded for this month.</td>
                                    </tr>
                                )}
                                {revenueData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{row.payment_mode}</td>
                                        <td className="p-4 text-center font-bold text-slate-600">{row.invoice_count}</td>
                                        <td className="p-4 text-right font-medium text-slate-600">{formatCurrency(row.total_subtotal)}</td>
                                        <td className="p-4 text-right font-medium text-amber-600">{formatCurrency(row.cgst)}</td>
                                        <td className="p-4 text-right font-medium text-amber-600">{formatCurrency(row.sgst)}</td>
                                        <td className="p-4 text-right font-black text-indigo-600 text-lg">{formatCurrency(row.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {revenueData.length > 0 && (
                                <tfoot>
                                    <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                                        <td className="p-4 font-black text-indigo-900">GRAND TOTAL</td>
                                        <td className="p-4 text-center font-black text-indigo-900">
                                            {revenueData.reduce((acc, r) => acc + parseInt(r.invoice_count), 0)}
                                        </td>
                                        <td className="p-4 text-right font-black text-indigo-900">
                                            {formatCurrency(revenueData.reduce((acc, r) => acc + parseFloat(r.total_subtotal), 0))}
                                        </td>
                                        <td className="p-4 text-right font-black text-indigo-900">
                                            {formatCurrency(revenueData.reduce((acc, r) => acc + parseFloat(r.cgst), 0))}
                                        </td>
                                        <td className="p-4 text-right font-black text-indigo-900">
                                            {formatCurrency(revenueData.reduce((acc, r) => acc + parseFloat(r.sgst), 0))}
                                        </td>
                                        <td className="p-4 text-right font-black text-indigo-900 text-xl">
                                            {formatCurrency(revenueData.reduce((acc, r) => acc + parseFloat(r.total_amount), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    )}
                </div>
            </div>

            {/* GST Invoice Export Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mr-4 shrink-0">
                        <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">GST Invoice Generator</h3>
                        <p className="text-slate-500 text-sm mt-1">Download standard B2B/B2C GST invoices in PDF format for any completed booking.</p>
                    </div>
                </div>
                
                <div className="flex items-center w-full md:w-auto">
                    <div className="relative w-full md:w-64 mr-2">
                        <input 
                            type="text" 
                            id="invoiceSearchInput"
                            placeholder="Enter Booking ID..." 
                            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-sm font-bold"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            const val = document.getElementById('invoiceSearchInput').value;
                            if(val) handlePrintInvoice(val);
                        }}
                        className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-colors shrink-0"
                        title="Generate PDF"
                    >
                        <Printer className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportsDashboard;
