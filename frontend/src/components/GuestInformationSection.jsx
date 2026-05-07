import { User, Briefcase, MapPin, Phone, Mail, Fingerprint } from 'lucide-react';

export default function GuestInformationSection({ formData, handleChange }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Guest Information</h3>
          <p className="text-sm text-slate-500 font-medium">Details of the person requiring accommodation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Guest Full Name <span className="text-red-500">*</span></label>
          <input required type="text" name="guest_name" value={formData.guest_name} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Enter guest name" />
        </div>
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Designation & Organization</label>
          <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. Professor, IIT Madras" />
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">Postal Address</label>
        <textarea name="postal_address" value={formData.postal_address} onChange={handleChange} rows="2" className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" placeholder="Full contact address"></textarea>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Telephone / Mobile <span className="text-red-500">*</span></label>
          <input required type="tel" name="guest_phone" value={formData.guest_phone} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Contact number" />
        </div>
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
          <input type="email" name="guest_email" value={formData.guest_email} onChange={handleChange} className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Email address" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ID Proof Type <span className="text-red-500">*</span></label>
          <div className="relative">
            <select required name="id_proof_type" value={formData.id_proof_type || 'Aadhar'} onChange={handleChange} className="block w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer">
              <option value="Aadhar">Aadhar</option>
              <option value="PAN">PAN</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID</option>
              <option value="Driving License">Driving License</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">ID Proof Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <Fingerprint className="absolute top-3.5 left-4 w-5 h-5 text-slate-400 pointer-events-none" />
            <input required type="text" name="id_proof_number" value={formData.id_proof_number || ''} onChange={handleChange} className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Enter ID number" />
          </div>
        </div>
      </div>
    </div>
  );
}