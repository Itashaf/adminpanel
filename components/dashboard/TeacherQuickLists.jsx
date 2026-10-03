import Link from 'next/link';
import { FiArrowRight, FiBell, FiBook } from 'react-icons/fi';
import Badge from '@/components/Badge';

const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function ListCard({ title, icon: Icon, iconBg, viewAllHref, items, emptyLabel, emptyHint, renderItem }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline cursor-pointer shrink-0"
        >
          View All <FiArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <span className={`flex items-center justify-center w-12 h-12 rounded-full mb-3 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </span>
          <p className="text-sm font-medium text-gray-600">{emptyLabel}</p>
          {emptyHint && <p className="text-xs text-gray-400 mt-1 max-w-[220px]">{emptyHint}</p>}
        </div>
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
        icon={FiBell}
        iconBg="bg-blue-100 text-blue-600"
        viewAllHref="/dashboard/notices"
        items={recentNotices}
        emptyLabel="No notices yet."
        renderItem={(notice) => (
          <div key={notice.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{notice.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {notice.audience === 'Class' ? `${notice.className}${notice.sectionName ? ` • Sec ${notice.sectionName}` : ''}` : notice.audience}
              </p>
            </div>
            <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
          </div>
        )}
      />

      <ListCard
        title="Recent Homework"
        icon={FiBook}
        iconBg="bg-violet-100 text-violet-600"
        viewAllHref="/dashboard/homework"
        items={upcomingHomework}
        emptyLabel="No homework assigned yet."
        emptyHint="Create and assign homework to share with your students."
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
