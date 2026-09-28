import { FiUsers, FiUser, FiFileText, FiCheckSquare, FiBook, FiCreditCard } from 'react-icons/fi';
import SchoolPulseCard from '@/components/dashboard/SchoolPulseCard';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import QuickActions from '@/components/dashboard/QuickActions';
import AccountantQuickActions from '@/components/dashboard/AccountantQuickActions';
import FeeOverviewCard from '@/components/dashboard/FeeOverviewCard';
import FeeCollectionBreakdownCard from '@/components/dashboard/FeeCollectionBreakdownCard';
import RecentFeePaymentsCard from '@/components/dashboard/RecentFeePaymentsCard';
import PendingFeesCard from '@/components/dashboard/PendingFeesCard';
import AttendanceOverviewCard from '@/components/dashboard/AttendanceOverviewCard';
import PromoBanner from '@/components/dashboard/PromoBanner';
import MyClassesCard from '@/components/dashboard/MyClassesCard';
import TeacherQuickLists from '@/components/dashboard/TeacherQuickLists';
import TeacherCheckInCard from '@/components/dashboard/TeacherCheckInCard';
import { getDashboardOverview, getTeacherDashboardOverview } from '@/lib/dashboard';
import { getPayments, getPendingFeesList, getPendingFeesStudentCount } from '@/lib/fees';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';
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

  const [{ stats, feesStats, attendanceToday, schoolPulse, snapshot }, userInfo, rbacUser] = await Promise.all([
    getDashboardOverview(),
    getCurrentActor(),
    getCurrentRBACUser(),
  ]);
  // Full name, not just a first name — seeded admins like "Dr. Radhika
  // Sharma" have a title prefix, so naively taking name.split(' ')[0] would
  // greet "Good morning, Dr." Falls back to "Admin" only for the
  // pre-existing gap where /dashboard is reached without ever going through
  // /login (no real session, no Teacher toggle either) — see lib/iam.js.
  const displayName = userInfo?.name || 'Admin';

  // Accountant only ever holds fees.*/students.view/reports/notices.view —
  // SchoolPulseCard's Attendance Today/New Admissions/Pending Tasks/Health
  // Score are all attendance-derived or outside that scope entirely, same
  // reasoning as the per-card permission gates below, just for the one card
  // that isn't built out of separately-gatable pieces.
  if (rbacUser?.roleKey === 'Accountant') {
    const [recentPayments, pendingFeesRows, pendingFeesStudentCount] = await Promise.all([
      getPayments({ status: 'SUCCESS', pageSize: 5 }),
      getPendingFeesList(5),
      getPendingFeesStudentCount(),
    ]);
    return (
      <AccountantDashboard
        stats={stats}
        feesStats={feesStats}
        feeCollectedToday={snapshot.feeCollectedToday}
        recentPayments={recentPayments.payments}
        pendingFeesRows={pendingFeesRows}
        pendingFeesStudentCount={pendingFeesStudentCount}
      />
    );
  }

  // null (no RBAC user — legacy-shape session, same fallback Sidebar uses)
  // means show everything; otherwise hide any card/action a real permission
  // check on its own route would 403 anyway (e.g. Accountant has no
  // teachers.view or attendance.student.view).
  const permissions = rbacUser ? [...rbacUser.permissions] : null;
  const can = (key) => permissions === null || permissions.includes(key);
  const showStudents = can('students.view');
  const showTeachers = can('teachers.view');
  const showAttendance = can('attendance.student.view');
  const showFees = can('fees.view');

  return (
    <div className="space-y-6">
      <SchoolPulseCard name={displayName} pulse={schoolPulse} />

      {(showStudents || showTeachers) && (
        <div className={`grid gap-4 ${showStudents && showTeachers ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showStudents && (
            <StatCard
              variant="minimal"
              accent="blue"
              label="Students"
              value={stats.totalStudents.value.toLocaleString()}
              icon={<FiUsers className="w-5 h-5" />}
              context={stats.totalStudents.newThisMonth > 0 ? `+${stats.totalStudents.newThisMonth} this month` : 'No change this month'}
              contextTone={stats.totalStudents.newThisMonth > 0 ? 'up' : undefined}
            />
          )}
          {showTeachers && (
            <StatCard
              variant="minimal"
              accent="violet"
              label="Teachers"
              value={stats.totalTeachers.value}
              icon={<FiUser className="w-5 h-5" />}
              context={stats.totalTeachers.newThisMonth > 0 ? `+${stats.totalTeachers.newThisMonth} this month` : 'No change this month'}
              contextTone={stats.totalTeachers.newThisMonth > 0 ? 'up' : undefined}
            />
          )}
        </div>
      )}

      <QuickActions permissions={permissions} />

      {(showAttendance || showFees) && (
        <div className={`grid grid-cols-1 gap-4 ${showAttendance && showFees ? 'lg:grid-cols-2' : ''}`}>
          {showAttendance && <AttendanceOverviewCard attendance={attendanceToday} />}
          {showFees && (
            <FeeOverviewCard
              totalFees={feesStats.totalFees}
              collected={feesStats.collected}
              pending={feesStats.pending}
              overdue={feesStats.overdue}
            />
          )}
        </div>
      )}

      <PromoBanner />
    </div>
  );
}

// Fees-only: total students (view-only, for context), fee collection
// figures, Fee Overview + Collection Breakdown, real Recent Payments /
// Pending Fees tables, and 3 real quick actions (see
// AccountantQuickActions.jsx). No attendance, no school health score, no
// teacher counts.
function AccountantDashboard({
  stats,
  feesStats,
  feeCollectedToday,
  recentPayments,
  pendingFeesRows,
  pendingFeesStudentCount,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          variant="minimal"
          accent="brand"
          label="Total Students"
          value={stats.totalStudents.value.toLocaleString()}
          icon={<FiUsers className="w-5 h-5" />}
          context="Enrolled this academic year"
        />
        <StatCard
          variant="minimal"
          accent="brand"
          label="Collected Today"
          value={`₹${feeCollectedToday.toLocaleString('en-IN')}`}
          icon={<FiCreditCard className="w-5 h-5" />}
          context={feeCollectedToday > 0 ? 'Collected so far today' : 'No payments yet today'}
        />
        <StatCard
          variant="minimal"
          accent="brand"
          label="Collected This Month"
          value={`₹${feesStats.collectedThisMonth.toLocaleString('en-IN')}`}
          icon={<FiCreditCard className="w-5 h-5" />}
          context="vs last month"
        />
        <StatCard
          variant="minimal"
          accent="brand"
          label="Pending Fees"
          value={`₹${feesStats.pending.toLocaleString('en-IN')}`}
          icon={<FiCreditCard className="w-5 h-5" />}
          context={`Across ${pendingFeesStudentCount} student${pendingFeesStudentCount === 1 ? '' : 's'}`}
        />
      </div>

      <AccountantQuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FeeOverviewCard
          totalFees={feesStats.totalFees}
          collected={feesStats.collected}
          pending={feesStats.pending}
          overdue={feesStats.overdue}
        />
        <FeeCollectionBreakdownCard totalFees={feesStats.totalFees} collected={feesStats.collected} pending={feesStats.pending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentFeePaymentsCard payments={recentPayments} />
        <PendingFeesCard rows={pendingFeesRows} />
      </div>
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
