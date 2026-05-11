import { X } from 'lucide-react';

export default function CategoryInfoModal({ show, onClose }) {
  if (!show) return null;
  return (
    <div className="mb-6 bg-white border border-indigo-100 rounded-2xl shadow-lg relative animate-fade-in overflow-hidden z-20">
      <div className="flex justify-between items-center bg-indigo-50/50 p-4 border-b border-indigo-100">
        <h4 className="font-bold text-indigo-900 text-sm">Category Eligibility & Rules</h4>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 border border-slate-200 font-bold whitespace-nowrap">Category</th>
              <th className="p-3 border border-slate-200 font-bold min-w-[250px]">Eligibility</th>
              <th className="p-3 border border-slate-200 font-bold min-w-[150px]">Authority</th>
              <th className="p-3 border border-slate-200 font-bold min-w-[150px]">Payment mode</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            <tr>
              <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-I</td>
              <td className="p-3 border border-slate-200 align-top">Guests invited by the Institute for academic, administrative work and for campus interview, other guests whose TA/DA borne by the institute will also come under this category.</td>
              <td className="p-3 border border-slate-200 align-top">Directors/Deans/Registrar/HODs</td>
              <td className="p-3 border border-slate-200 align-top">Institute</td>
            </tr>
            <tr className="bg-slate-50/30">
              <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-II</td>
              <td className="p-3 border border-slate-200 align-top">Guests/ individuals visiting institute in connection with Scheme, Project/consultancy, short term courses, workshops, symposia, seminars, conferences, etc. having direct relevance to activities of NIT Trichy and where TA/DA is borne by individuals or organizations other than NIT Trichy.</td>
              <td className="p-3 border border-slate-200 align-top">Deans/HODs</td>
              <td className="p-3 border border-slate-200 align-top">Project/Respective Co-ordinator/by the guest</td>
            </tr>
            <tr>
              <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-III</td>
              <td className="p-3 border border-slate-200 align-top">Employee/Ex-employee, Guests of Faculty/staff, Students’ parents/Guardians and Alumni. Government officials whose visits are not in connection with the work of NIT Trichy and Guests from other academic institutes offered accommodation on reciprocal basis</td>
              <td className="p-3 border border-slate-200 align-top">Faculty/Staff</td>
              <td className="p-3 border border-slate-200 align-top">By Individual before checking out/By faculty or staff concerned</td>
            </tr>
            <tr className="bg-slate-50/30">
              <td className="p-3 border border-slate-200 font-bold text-slate-800 whitespace-nowrap align-top">CAT-IV</td>
              <td className="p-3 border border-slate-200 align-top">Guests not covered under above categories</td>
              <td className="p-3 border border-slate-200 align-top">Registrar/HODs/Faculty</td>
              <td className="p-3 border border-slate-200 align-top">By Individual before checking out</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}