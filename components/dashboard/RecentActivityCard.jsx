import { FiCreditCard, FiUserPlus, FiCheckSquare, FiFileText } from 'react-icons/fi';

const TYPE_ICON = {
  fee: FiCreditCard,
  admission: FiUserPlus,
  attendance: FiCheckSquare,
  exam: FiFileText,
};

function relativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Merged real event timeline (see lib/dashboard.js's getRecentActivity) —
// fee payments, admissions, submitted attendance, published exams. No
// "Teacher leave approved" event type: no Leave model exists yet, so it's
// left out rather than faked. Linear/GitHub-style compact feed, not cards.
export default function RecentActivityCard({ activity = [] }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-5">Recent Activity</h3>

      {activity.length === 0 ? (
        <p className="text-sm text-gray-400">No activity yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto -mr-2 pr-2">
          <ul className="relative">
            {activity.map((event, index) => {
              const Icon = TYPE_ICON[event.type] || FiFileText;
              const isLast = index === activity.length - 1;
              return (
                <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {!isLast && <span className="absolute left-[13px] top-6 bottom-0 w-px bg-gray-100" />}
                  <span className="relative z-10 flex items-center justify-center w-[26px] h-[26px] rounded-full bg-gray-50 text-gray-400 shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm text-gray-700 leading-snug">{event.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(event.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
