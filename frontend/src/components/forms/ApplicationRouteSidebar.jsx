import React from 'react';
import { CheckSquare } from 'lucide-react';

export default function ApplicationRouteSidebar({ formData, user }) {
  const isSuiteRoom = formData?.room_type === 'Suite Room' || formData?.room_type === 'Mini Suite Room';
  const isStudent = user?.role === 'student' || user?.role === 'STUDENT';
  const isPersonal = ['3', '4'].includes(String(formData?.category_id)) && !isStudent;

  let approvalSteps = [
    {
      role: 'Applicant',
      title: 'Application submitted',
      desc: 'You fill in guest details, stay dates, room preference, and attach required documents. A booking reference is generated on submission.'
    }
  ];
  
  if (!isPersonal) {
    if (isSuiteRoom) {
      approvalSteps.push({
        role: 'HOD / Dean',
        title: 'HOD / Dean review',
        desc: 'Your HOD / Dean reviews the suite request. If approved, it is forwarded to the Director.'
      });
      approvalSteps.push({
        role: 'Director',
        title: 'Director review',
        desc: 'The Director reviews the suite request. If approved, it moves to the GH Chairperson for final processing.'
      });
    } else {
      approvalSteps.push({
        role: 'Assigned authority',
        title: 'Authority reviews & forwards',
        desc: 'Your HOD or designated authority reviews the request. If approved, it moves to the GH Chairperson. If rejected, you are notified and may reapply.'
      });
    }
  }

  approvalSteps.push({
    role: 'GH chairperson',
    title: 'Final approval decision',
    desc: 'The Guest House Chairperson gives the final verdict. Once approved, the booking moves to reception for room assignment.'
  });

  const receptionSteps = [
    {
      role: 'Reception',
      title: 'Room assigned',
      desc: 'Reception reviews your booking and assigns a physical room. You receive a QR code — keep it for check-in at the counter.'
    },
    {
      role: 'Reception',
      title: 'Check-in',
      desc: 'Present your QR code at the reception counter. Each guest is checked in individually. Room keys are issued once all guests are verified.'
    },
    {
      role: 'Reception',
      title: 'Check-out & billing',
      desc: 'On departure, reception checks out each guest. Once all guests are checked out, a final GST invoice is generated and payment is collected.'
    }
  ];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <h3 className="text-lg font-extrabold text-slate-800 mb-5">
        Application route
      </h3>
      
      <div className="relative">
        
        {/* APPROVAL PHASE */}
        <div className="relative">
          {/* Blue Line Connector */}
          <div className="absolute left-[15px] top-4 bottom-0 w-[2px] bg-blue-500 z-0"></div>

          <div className="space-y-5 relative z-10">
            {approvalSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 z-10 mt-0.5 relative">
                  {idx + 1}
                  {/* Small white background to block the line from crossing through the circle cleanly */}
                  <div className="absolute inset-0 bg-blue-600 rounded-full -z-10 border-4 border-white box-content -m-1"></div>
                </div>
                <div className="flex-1 pb-1">
                  <div className="inline-block bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md mb-1.5 uppercase tracking-wide">
                    {step.role}
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-snug mb-1">
                    {step.title}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DIVIDER: AFTER APPROVAL */}
        <div className="flex items-center my-4 relative z-10 bg-white py-1">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            After Approval — Reception
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* RECEPTION PHASE */}
        <div className="relative">
          {/* Green Line Connector */}
          <div className="absolute left-[15px] top-4 bottom-6 w-[2px] bg-emerald-500 z-0"></div>

          <div className="space-y-5 relative z-10">
            {receptionSteps.map((step, idx) => {
              const stepNumber = approvalSteps.length + idx + 1;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 z-10 mt-0.5 relative">
                    {stepNumber}
                    <div className="absolute inset-0 bg-emerald-600 rounded-full -z-10 border-4 border-white box-content -m-1"></div>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md mb-1.5 uppercase tracking-wide">
                      {step.role}
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-snug mb-1">
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DIVIDER: COMPLETED */}
        <div className="flex items-center my-4 relative z-10 bg-white py-1">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Completed
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* TERMINAL BADGE */}
        <div className="relative z-10 bg-[#14532d] p-3 rounded-xl flex items-center gap-4 shadow-sm mx-1">
          <div className="bg-emerald-600/30 p-2 rounded-lg text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-50">Stay completed</p>
            <p className="text-[10px] font-medium text-emerald-400/80 mt-0.5">GST invoice issued · Payment settled</p>
          </div>
        </div>

      </div>
    </div>
  );
}
