import Link from 'next/link';
import { FiArrowRight, FiBell, FiBook } from 'react-icons/fi';

const PRIORITY_DOT = { Normal: 'bg-blue-600', Important: 'bg-amber-500', Urgent: 'bg-red-500' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ListCard({ title, viewAllHref, items, emptyLabel, emptyHint, emptyIcon: EmptyIcon, renderItem }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 pb-[50px] h-full flex flex-col transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-base font-bold text-gray-900 truncate">{title}</p>
        <Link href={viewAllHref} className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-800 shrink-0">
          View All <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-50 text-gray-300 mb-2">
            <EmptyIcon className="w-5 h-5" />
          </span>
          <p className="text-sm text-gray-500">{emptyLabel}</p>
          {emptyHint && <p className="text-xs text-gray-400 mt-1 max-w-[220px]">{emptyHint}</p>}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

// The two list cards beside "My Classes" on the Teacher dashboard — the
// caller lays them out in its own grid.
export default function TeacherQuickLists({ recentNotices, upcomingHomework }) {
  return (
    <>
      <ListCard
        title="Recent Notices"
        emptyIcon={FiBell}
        viewAllHref="/dashboard/notices"
        items={recentNotices}
        emptyLabel="No notices yet."
        renderItem={(notice) => (
          <div key={notice.id} className="flex items-start gap-3 py-3">
            <span className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[notice.priority] || PRIORITY_DOT.Normal}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{notice.title}</p>
              <p className="text-sm text-gray-500 truncate">
                {notice.audience === 'Class' ? `${notice.className}${notice.sectionName ? ` • Sec ${notice.sectionName}` : ''}` : notice.audience}
              </p>
            </div>
            <span className="text-sm text-gray-400 whitespace-nowrap shrink-0">{formatDate(notice.createdAt)}</span>
          </div>
        )}
      />

      <ListCard
        title="Recent Homework"
        emptyIcon={FiBook}
        viewAllHref="/dashboard/homework"
        items={upcomingHomework}
        emptyLabel="No homework assigned yet."
        emptyHint="Create and assign homework to share with your students."
        renderItem={(hw) => (
          <div key={hw.id} className="flex items-start gap-3 py-3">
            <span className="mt-2 w-2.5 h-2.5 rounded-full shrink-0 bg-indigo-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{hw.title}</p>
              <p className="text-sm text-gray-500 truncate">
                {hw.subject} • {hw.className} Sec {hw.sectionName}
              </p>
            </div>
            <span className="text-sm text-gray-400 whitespace-nowrap shrink-0">{formatDate(hw.assignedDate)}</span>
          </div>
        )}
      />
    </>
  );
}
