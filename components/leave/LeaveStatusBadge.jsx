import { LEAVE_STATUS_STYLES } from '@/lib/leaveConstants';

export default function LeaveStatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEAVE_STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
