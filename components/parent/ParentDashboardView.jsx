import Link from 'next/link';
import {
  FiCreditCard,
  FiCheckSquare,
  FiBell,
  FiBook,
  FiUser,
  FiFileText,
  FiChevronRight,
  FiArrowRight,
} from 'react-icons/fi';
import Badge from '@/components/Badge';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const QUICK_LINKS = [
  { label: 'My Fees', href: '/parent/fees', icon: FiCreditCard },
  { label: 'Attendance', href: '/parent/attendance', icon: FiCheckSquare },
  { label: 'Homework', href: '/parent/homework', icon: FiBook },
  { label: 'Notices', href: '/parent/notices', icon: FiBell },
  { label: 'Exams', href: '/parent/exams', icon: FiFileText },
  { label: 'My Profile', href: '/parent/profile', icon: FiUser },
];

const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

const TODAY_STATUS_META = {
  Present: { label: 'Present Today', dot: 'bg-green-600', bg: 'bg-green-50', text: 'text-green-700' },
  Absent: { label: 'Absent Today', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  Leave: { label: 'On Leave Today', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
};

export default function ParentDashboardView({
  student,
  totalDue,
  attendancePercent,
  attendancePresent,
  attendanceTotal,
  todayStatus,
  noticesCount,
  recentNotices,
  homeworkCount,
  recentHomework,
}) {
  const todayMeta = TODAY_STATUS_META[todayStatus] || { label: 'Not Marked Yet', dot: 'bg-gray-300', bg: 'bg-gray-50', text: 'text-gray-500' };
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">{greeting()},</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {student.firstName} {student.lastName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's an overview of your child's school activity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white text-lg font-semibold shrink-0">
            {student.initials}
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {student.class}
              {student.section ? ` - ${student.section}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Admission No. {student.admissionId}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1 ${todayMeta.bg} ${todayMeta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${todayMeta.dot}`} />
            {todayMeta.label}
          </span>
          <p className="text-xs text-gray-400 mt-1.5">{todayLabel}</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map(({ label, href, icon: Icon, comingSoon }) => {
            const content = (
              <>
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{label}</span>
                <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </>
            );
            if (comingSoon) {
              return (
                <div key={label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 opacity-50 cursor-not-allowed">
                  {content}
                </div>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-100 transition cursor-pointer"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-green-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-green-600 mb-3">
            <FiCreditCard className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">Fees Due</p>
          <p className="text-xl font-bold text-green-700 mt-1">{totalDue > 0 ? formatCurrency(totalDue) : 'All Paid'}</p>
          <p className="text-xs text-gray-500 mt-1">{totalDue > 0 ? 'Payment pending' : "Great! You're up to date."}</p>
        </div>
        <div className="rounded-2xl p-5 bg-blue-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-blue-600 mb-3">
            <FiCheckSquare className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">Attendance (This Month)</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{attendancePercent !== null ? `${attendancePercent}%` : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {attendanceTotal > 0 ? `Present ${attendancePresent}/${attendanceTotal} days` : 'No attendance marked yet.'}
          </p>
        </div>
        <div className="rounded-2xl p-5 bg-amber-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-amber-600 mb-3">
            <FiBell className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">New Notices</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{noticesCount}</p>
          <p className="text-xs text-gray-500 mt-1">{noticesCount > 0 ? 'Check what\'s new' : 'No new notices'}</p>
        </div>
        <div className="rounded-2xl p-5 bg-violet-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-violet-600 mb-3">
            <FiBook className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">Homework Assigned</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{homeworkCount}</p>
          <p className="text-xs text-gray-500 mt-1">{homeworkCount > 0 ? 'Check the latest' : 'Nothing assigned yet'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Recent Notices</p>
            <Link href="/parent/notices" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View All <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentNotices.length === 0 ? (
            <div className="text-center py-10 px-6">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
                <FiFileText className="w-6 h-6" />
              </span>
              <p className="text-sm font-bold text-gray-700">No notices yet.</p>
              <p className="text-xs text-gray-400 mt-1">We'll notify you here when there are new updates from the school.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{notice.title}</p>
                    <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(notice.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Recent Homework</p>
            <Link href="/parent/homework" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View All <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentHomework.length === 0 ? (
            <div className="text-center py-10 px-6">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
                <FiBook className="w-6 h-6" />
              </span>
              <p className="text-sm font-bold text-gray-700">Nothing assigned yet.</p>
              <p className="text-xs text-gray-400 mt-1">You're all set! New homework will appear here when assigned.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentHomework.map((hw) => (
                <div key={hw.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{hw.title}</p>
                    <Badge label={hw.subject} variant="violet" />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(hw.assignedDate)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
