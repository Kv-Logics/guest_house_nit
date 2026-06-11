import React, { useState, useEffect } from 'react';
import { FileText, Search, Loader2, Download } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

export default function StayRegisterTab() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegister();
  }, []);

  const fetchRegister = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await receptionService.getGuestStayRegister();
      if (res.success) {
        setData(res.data || []);
        setFilteredData(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch guest stay register:', err);
      setError(err.message || 'Failed to load guest stay register data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredData(data);
      return;
    }

    const filtered = data.filter(item => 
      (item.guest_name && item.guest_name.toLowerCase().includes(query)) ||
      (item.room_number && item.room_number.toLowerCase().includes(query)) ||
      (item.bill_number && item.bill_number.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "Sl No", 
      "Guest Name", 
      "Category", 
      "Date of Check-In", 
      "Time of Check-In",
      "Room Number", 
      "Occupancy", 
      "Date of Check-Out", 
      "Time of Check-Out", 
      "Number of Days",
      "Amount Per Day", 
      "Extra Bed Charge Per Day", 
      "Total Rent Amount", 
      "GST @ 12%",
      "Total Amount", 
      "Bill Number", 
      "Bill Date",
      "Remarks"
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of filteredData) {
      const values = [
        row.sl_no,
        `"${(row.guest_name || '').replace(/"/g, '""')}"`,
        `"${(row.category || '').replace(/"/g, '""')}"`,
        row.date_of_check_in,
        row.time_of_check_in,
        row.room_number,
        row.occupancy,
        row.date_of_check_out,
        row.time_of_check_out,
        row.number_of_days,
        row.amount_per_day,
        row.extra_bed_charge_per_day,
        row.total_rent_amount,
        row.gst_amount,
        row.total_amount,
        `"${(row.bill_number || '').replace(/"/g, '""')}"`,
        row.bill_date,
        `"${(row.remarks || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stay_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
          <input
            type="text"
            placeholder="Search by name, room, category, or bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredData.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm border border-emerald-500"
        >
          <Download className="w-4 h-4" />
          Export Register CSV
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-55 border border-red-200 text-red-700 rounded-xl font-semibold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-slate-500 font-bold mt-3 text-sm">Fetching stayed register data...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">No Records Found</h3>
          <p className="text-xs text-slate-400 mt-1 font-bold">Try adjusting your search query or check back later.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Sl No</th>
                  <th className="px-6 py-4">Guest Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4">Check-Out</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4 text-center">Days</th>
                  <th className="px-6 py-4 text-right">Rent/Day</th>
                  <th className="px-6 py-4 text-right">Extra Bed/Day</th>
                  <th className="px-6 py-4 text-right">Total Rent</th>
                  <th className="px-6 py-4 text-right">GST (12%)</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4">Bill Number & Date</th>
                  <th className="px-6 py-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredData.map((row) => (
                  <tr key={row.sl_no} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-400">#{row.sl_no}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-800">{row.guest_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 uppercase tracking-wider text-slate-600">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>{row.date_of_check_in}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{row.time_of_check_in}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>{row.date_of_check_out}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{row.time_of_check_out}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg text-indigo-700">
                        {row.room_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">{row.number_of_days}</td>
                    <td className="px-6 py-4 text-right">₹{row.amount_per_day}</td>
                    <td className="px-6 py-4 text-right">₹{row.extra_bed_charge_per_day}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{row.total_rent_amount}</td>
                    <td className="px-6 py-4 text-right text-slate-500">₹{row.gst_amount}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-indigo-600">₹{row.total_amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{row.bill_number}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{row.bill_date}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate" title={row.remarks || ''}>
                      {row.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
