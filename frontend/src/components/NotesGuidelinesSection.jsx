import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function NotesGuidelinesSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden mb-10 transition-all duration-300">
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-blue-900 text-lg tracking-tight">NITT Guest House Rules & Guidelines</h3>
        </div>
        {isOpen ? <ChevronUp className="text-blue-600" /> : <ChevronDown className="text-blue-600" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-blue-100 text-sm text-slate-700 leading-relaxed bg-white space-y-4">
          <div className="flex items-start gap-3 bg-blue-50/80 p-4 rounded-xl border border-blue-100 text-blue-800 mb-4">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium">Please review the official guidelines from Page 2 of the NITT Guest House form before proceeding with your application.</p>
          </div>
          
          <ol className="list-decimal pl-5 space-y-3 marker:text-blue-600 marker:font-bold mb-6">
            <li>Priority for accommodation will be accorded to Guests covered under CAT-I and CAT-II.</li>
            <li>For Block booking for conference / short term courses etc. 50% payment/booking to be made at least three week in advance.</li>
            <li>Room charges are levied on 24 hours basis.</li>
            <li>Student requiring accommodations for their parents are required to get their requisition forwarded by HOD. Students are not allowed to stay in Guest House. However, a Student can stay with their parents with prior permission through their respective Wardens and Dean of Students.</li>
            <li>Guest under CAT-III & IV will be accommodated if room(s) is/are available.</li>
            <li>Booking is not permitted for guests undergoing medical treatment/advice who are suffering from communicable disease or are bed ridden or are post-delivery case.</li>
            <li>In case of emergency due to heavy booking, a single occupant of the room may be asked to share the accommodation with another guest. The accommodation in the Guest House shall be provided to the people as per the Institute Norms. The management of guest house may at its discretion, cancel a booking or offer alternate accommodation depending upon the availability and other unforeseen circumstances.</li>
            <li>Detailed rules and regulations are available at Guest House Reception.</li>
            <li>The management of the NITT Guest House reserve the right to refuse booking or cancel/Vacate the accommodation in the Guest House, at any stage, without assigning any reason.</li>
          </ol>

          <div className="mt-8 border-t border-blue-100 pt-6">
            <h4 className="font-bold text-blue-900 mb-4 text-base">The details of the categories of guest are given below:</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                    <th className="p-3 border-r border-slate-200 font-bold w-20">Category</th>
                    <th className="p-3 border-r border-slate-200 font-bold">Eligibility</th>
                    <th className="p-3 border-r border-slate-200 font-bold w-32">Authority</th>
                    <th className="p-3 font-bold w-32">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">CAT-I</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Guests invited by the Institute for academic, administrative work and for campus interview, other guests whose TA/DA borne by the institute will also come under this category.</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Directors/Deans/Registrar/HODs</td>
                    <td className="p-3 text-slate-600">Institute</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">CAT-II</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Guests/ individuals visiting institute in connection with Scheme, Project/consultancy, short term courses, workshops, symposia, seminars, conferences, etc. having direct relevance to activities of NIT Trichy and where TA/DA is borne by individuals or organizations other than NIT Trichy.</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Deans/HODs</td>
                    <td className="p-3 text-slate-600">Project/Respective Co-ordinator/by the guest</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">CAT-III</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Employee/Ex-employee, Guests of Faculty/staff, Students’ parents/Guardians and Alumni. Government officials whose visits are not in connection with the work of NIT Trichy and Guests from other academic institutes offered accommodation on reciprocal basis</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Faculty/Staff</td>
                    <td className="p-3 text-slate-600">By Individual before checking out/By faculty or staff concerned</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-800">CAT-IV</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Guests not covered under above categories</td>
                    <td className="p-3 border-r border-slate-200 text-slate-600">Registrar/HODs/Faculty</td>
                    <td className="p-3 text-slate-600">By Individual before checking out</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}