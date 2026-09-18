import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import Badge from '@/components/Badge';

const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function ListCard({ title, viewAllHref, items, emptyLabel, renderItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline cursor-pointer"
        >
          View All <FiArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

export default function TeacherQuickLists({ recentNotices, upcomingHomework }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ListCard
        title="Recent Notices"
        viewAllHref="/dashboard/notices"
        items={recentNotices}
        emptyLabel="No notices yet."
        renderItem={(notice) => (
          <div key={notice.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{notice.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{notice.audience === 'Whole School' ? 'Whole School' : `${notice.className} • Sec ${notice.sectionName}`}</p>
            </div>
            <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
          </div>
        )}
      />

      <ListCard
        title="Recent Homework"
        viewAllHref="/dashboard/homework"
        items={upcomingHomework}
        emptyLabel="No homework assigned yet."
        renderItem={(hw) => (
          <div key={hw.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{hw.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hw.subject} • {hw.className} Sec {hw.sectionName}
              </p>
            </div>
            <span className="text-xs font-medium text-gray-500 shrink-0">{formatDate(hw.assignedDate)}</span>
          </div>
        )}
      />
    </div>
  );
}
