import Link from 'next/link';
import { FiCreditCard, FiBell, FiBook, FiFileText, FiArrowRight, FiUsers, FiVolume2, FiCalendar } from 'react-icons/fi';
import Badge from '@/components/Badge';
import ParentKPICard from '@/components/parent/ParentKPICard';
import ParentChildCard from '@/components/parent/ParentChildCard';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PRIORITY_DOT = { Normal: 'bg-blue-600', Important: 'bg-amber-500', Urgent: 'bg-red-500' };

function ListCard({ icon: Icon, title, href, children }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Icon className="w-[18px] h-[18px]" />
          </span>
          <p className="text-base font-bold text-gray-900 truncate">{title}</p>
        </div>
        <Link href={href} className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-800 shrink-0">
          View All <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ icon: Icon, text }) {
  return (
    <div className="text-center py-8 px-4">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-50 text-gray-300 mb-2">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

export default function ParentDashboardView({
  parentName,
  student,
  students,
  activeStudentId,
  totalDue,
  attendancePercent,
  attendancePresent,
  attendanceTotal,
  homeworkCount,
  recentHomework,
  upcomingExamsCount,
  nextExam,
  recentNotices,
  upcomingEvents,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xl text-gray-500">Welcome</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-0.5">{parentName}</h1>
        </div>
        <ParentChildCard student={student} students={students} activeStudentId={activeStudentId} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ParentKPICard
          label="Fees Due"
          icon={<FiCreditCard className="w-5 h-5" />}
          value={totalDue > 0 ? formatCurrency(totalDue) : 'All Paid'}
          context={totalDue > 0 ? 'Payment pending' : "Great! You're up to date."}
          dotClassName={totalDue > 0 ? 'bg-red-400' : 'bg-green-400'}
        />
        <ParentKPICard
          label="Attendance (This Month)"
          icon={<FiUsers className="w-5 h-5" />}
          value={attendancePercent !== null ? `${attendancePercent}%` : '—'}
          context={attendanceTotal > 0 ? `Present for ${attendancePresent} of ${attendanceTotal} days` : 'No attendance marked yet.'}
        />
        <ParentKPICard
          label="Homework Assigned"
          icon={<FiBook className="w-5 h-5" />}
          value={homeworkCount}
          context={recentHomework[0] ? `Latest: ${recentHomework[0].title}` : 'Nothing assigned yet'}
          dotClassName="bg-amber-400"
        />
        <ParentKPICard
          label="Upcoming Exams"
          icon={<FiFileText className="w-5 h-5" />}
          value={upcomingExamsCount}
          context={nextExam ? `Next: ${nextExam.name}` : 'No upcoming exam scheduled'}
          dotClassName="bg-sky-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1.1fr_0.85fr] gap-4">
        <ListCard icon={FiVolume2} title="Recent Notices" href="/parent/notices">
          {recentNotices.length === 0 ? (
            <EmptyRow icon={FiBell} text="No notices yet." />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[notice.priority] || PRIORITY_DOT.Normal}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{notice.title}</p>
                    <p className="text-sm text-gray-500 truncate">{notice.message}</p>
                  </div>
                  <span className="text-sm text-gray-400 whitespace-nowrap shrink-0">{formatDate(notice.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </ListCard>

        <ListCard icon={FiBook} title="Latest Homework" href="/parent/homework">
          {recentHomework.length === 0 ? (
            <EmptyRow icon={FiBook} text="Nothing assigned yet." />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentHomework.map((hw) => (
                <div key={hw.id} className="flex items-start gap-3 py-3">
                  <span className="mt-2 w-2.5 h-2.5 rounded-full shrink-0 bg-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{hw.title}</p>
                    <p className="text-sm text-gray-500 truncate">{hw.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge label={hw.subject} variant="violet" />
                    <span className="text-sm text-gray-400 whitespace-nowrap">{formatDate(hw.assignedDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ListCard>

        <ListCard icon={FiCalendar} title="Upcoming Events" href="/parent/calendar">
          {upcomingEvents.length === 0 ? (
            <EmptyRow icon={FiCalendar} text="No upcoming events." />
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const start = new Date(`${event.startDate}T00:00:00`);
                const multiDay = event.endDate && event.endDate !== event.startDate;
                return (
                  <div key={event.id} className="flex items-center gap-3">
                    <span className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 shrink-0 leading-tight">
                      <span className="text-base font-bold">{start.getDate()}</span>
                      <span className="text-xs">{start.toLocaleDateString('en-US', { month: 'short' })}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {multiDay ? `${formatDate(event.startDate)} – ${formatDate(event.endDate)}` : event.category}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ListCard>
      </div>
    </div>
  );
}
