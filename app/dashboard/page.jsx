import { FiUsers, FiUser, FiFileText, FiCheckSquare, FiBook } from 'react-icons/fi';
import SchoolPulseCard from '@/components/dashboard/SchoolPulseCard';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import FeeOverviewCard from '@/components/dashboard/FeeOverviewCard';
import AttendanceOverviewCard from '@/components/dashboard/AttendanceOverviewCard';
import PromoBanner from '@/components/dashboard/PromoBanner';
import MyClassesCard from '@/components/dashboard/MyClassesCard';
import TeacherQuickLists from '@/components/dashboard/TeacherQuickLists';
import TeacherCheckInCard from '@/components/dashboard/TeacherCheckInCard';
import { getDashboardOverview, getTeacherDashboardOverview } from '@/lib/dashboard';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';
import { getTeacherCheckInStatus } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { toLocalDateStr } from '@/lib/attendance';

export const metadata = {
  title: 'Dashboard | SchoolApp 360',
};

export default async function DashboardPage() {
  // Real session first — carries classTeacherOf (see lib/iam.js), which
  // getTeacherDashboardOverview needs for a Class Teacher with zero subject
  // assignments of their own. The dashboard-toggle fallback never has it.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());

  if (currentUser.role === 'Teacher') {
    return <TeacherDashboard currentUser={currentUser} />;
  }

  const [{ stats, feesStats, attendanceToday, schoolPulse }, userInfo] = await Promise.all([
    getDashboardOverview(),
    getCurrentActor(),
  ]);
  // Full name, not just a first name — seeded admins like "Dr. Radhika
  // Sharma" have a title prefix, so naively taking name.split(' ')[0] would
  // greet "Good morning, Dr." Falls back to "Admin" only for the
  // pre-existing gap where /dashboard is reached without ever going through
  // /login (no real session, no Teacher toggle either) — see lib/iam.js.
  const displayName = userInfo?.name || 'Admin';

  return (
    <div className="space-y-6">
      <SchoolPulseCard name={displayName} pulse={schoolPulse} />

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          variant="minimal"
          accent="blue"
          label="Students"
          value={stats.totalStudents.value.toLocaleString()}
          icon={<FiUsers className="w-5 h-5" />}
          context={stats.totalStudents.newThisMonth > 0 ? `+${stats.totalStudents.newThisMonth} this month` : 'No change this month'}
          contextTone={stats.totalStudents.newThisMonth > 0 ? 'up' : undefined}
        />
        <StatCard
          variant="minimal"
          accent="violet"
          label="Teachers"
          value={stats.totalTeachers.value}
          icon={<FiUser className="w-5 h-5" />}
          context={stats.totalTeachers.newThisMonth > 0 ? `+${stats.totalTeachers.newThisMonth} this month` : 'No change this month'}
          contextTone={stats.totalTeachers.newThisMonth > 0 ? 'up' : undefined}
        />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceOverviewCard attendance={attendanceToday} />
        <FeeOverviewCard
          totalFees={feesStats.totalFees}
          collected={feesStats.collected}
          pending={feesStats.pending}
          overdue={feesStats.overdue}
        />
      </div>

      <PromoBanner />
    </div>
  );
}

// A Teacher's dashboard is scoped entirely to their own assignments — their
// classes' student counts and attendance status, their own active homework,
// and a peek at notices/homework — never the school-wide numbers above.
async function TeacherDashboard({ currentUser }) {
  const [{ classRows, stats, recentNotices, upcomingHomework }, actor, checkInStatus] = await Promise.all([
    getTeacherDashboardOverview(currentUser),
    getCurrentActor(),
    currentUser.teacherId
      ? getTeacherCheckInStatus(currentUser.teacherId, await resolveSchoolId(), toLocalDateStr(new Date()))
      : null,
  ]);

  return (
    <div className="space-y-6">
      <WelcomeBanner name={actor?.name || currentUser.name} />

      {checkInStatus && <TeacherCheckInCard initialStatus={checkInStatus} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="My Classes"
          value={stats.totalClasses}
          icon={<FiFileText className="w-4 h-4 text-violet-700" />}
          iconBgClassName="bg-violet-100"
        />
        <StatCard
          label="My Students"
          value={stats.totalStudents}
          icon={<FiUsers className="w-4 h-4 text-blue-600" />}
          iconBgClassName="bg-blue-100"
        />
        <StatCard
          label="Today's Attendance"
          value={`${stats.attendanceMarkedCount}/${stats.attendanceTotal}`}
          icon={<FiCheckSquare className="w-4 h-4 text-green-600" />}
          iconBgClassName="bg-green-100"
        />
        <StatCard
          label="Active Homework"
          value={stats.activeHomeworkCount}
          icon={<FiBook className="w-4 h-4 text-amber-600" />}
          iconBgClassName="bg-amber-100"
        />
      </div>

      <MyClassesCard classRows={classRows} />

      <TeacherQuickLists recentNotices={recentNotices} upcomingHomework={upcomingHomework} />
    </div>
  );
}
