import React from 'react';
import { Clock, CheckCircle, XCircle, UserCheck, CalendarCheck, AlertCircle } from 'lucide-react';
import { BOOKING_STATUS } from '../../utils/constants';

export default function StatusBadge({ status }) {
    const config = {
        [BOOKING_STATUS.PENDING_APPROVER]: { color: 'bg-amber-100 text-amber-800', icon: Clock, label: 'Pending Approver' },
        [BOOKING_STATUS.APPROVER_APPROVED]: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Approver Approved' },
        [BOOKING_STATUS.APPROVER_REJECTED]: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected (Approver)' },
        [BOOKING_STATUS.PENDING_ADMIN]: { color: 'bg-purple-100 text-purple-800', icon: Clock, label: 'Pending Admin' },
        [BOOKING_STATUS.ADMIN_APPROVED]: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Admin Approved' },
        [BOOKING_STATUS.ADMIN_REJECTED]: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected (Admin)' },
        [BOOKING_STATUS.READY_FOR_CHECKIN]: { color: 'bg-teal-100 text-teal-800', icon: CheckCircle, label: 'Ready for Check-In' },
        [BOOKING_STATUS.CHECKED_IN]: { color: 'bg-indigo-100 text-indigo-800', icon: UserCheck, label: 'Checked In' },
        [BOOKING_STATUS.CHECKED_OUT]: { color: 'bg-slate-200 text-slate-800', icon: CalendarCheck, label: 'Checked Out' },
        [BOOKING_STATUS.NO_SHOW]: { color: 'bg-rose-100 text-rose-800', icon: AlertCircle, label: 'No Show' },
    };

    const active = config[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status || 'Unknown' };
    const Icon = active.icon;

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${active.color} whitespace-nowrap`}>
            <Icon className="w-3.5 h-3.5 mr-1" /> {active.label}
        </span>
    );
}