import Link from 'next/link';
import { FiUsers, FiUser, FiFileText, FiCheckSquare, FiBook, FiCreditCard, FiArrowRight } from 'react-icons/fi';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import KPICard from '@/components/dashboard/KPICard';
import TotalStudentsKPICard from '@/components/dashboard/TotalStudentsKPICard';
import QuickActions from '@/components/dashboard/QuickActions';
import AccountantQuickActions from '@/components/dashboard/AccountantQuickActions';
import FeeOverviewCard from '@/components/dashboard/FeeOverviewCard';
import FeeCollectionChart from '@/components/dashboard/FeeCollectionChart';
import FeeCollectionBreakdownCard from '@/components/dashboard/FeeCollectionBreakdownCard';
import RecentFeePaymentsCard from '@/components/dashboard/RecentFeePaymentsCard';
import PendingFeesCard from '@/components/dashboard/PendingFeesCard';
import AttendanceCollectionChart from '@/components/dashboard/AttendanceCollectionChart';
import FeeDefaultersCard from '@/components/dashboard/FeeDefaultersCard';
import UpcomingExamsCard from '@/components/dashboard/UpcomingExamsCard';
import MyClassesCard from '@/components/dashboard/MyClassesCard';
import TeacherQuickLists from '@/components/dashboard/TeacherQuickLists';
import TeacherCheckInCard from '@/components/dashboard/TeacherCheckInCard';
import { getDashboardOverview, getTeacherDashboardOverview } from '@/lib/dashboard';
import { getPayments, getPendingFeesList, getPendingFeesStudentCount, getFeeCollectionTrend } from '@/lib/fees';
import { getAllExams, getExamDashboardStats } from '@/lib/exams';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';
import { getTeacherCheckInStatus } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { toLocalDateStr, getAttendanceCollectionTrend } from '@/lib/attendance';

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

  const [{ stats, feesStats, attendanceToday, attendanceWeekly, snapshot }, userInfo, rbacUser] = await Promise.all([
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
  const showExams = can('exams.view');

  const [defaulters, [dailyFeeTrend, monthlyFeeTrend, yearlyFeeTrend], pendingFeesStudentCount] = await Promise.all([
    showFees ? getPendingFeesList(5, { onlyOverdue: true }) : Promise.resolve([]),
    showFees
      ? Promise.all([getFeeCollectionTrend('daily'), getFeeCollectionTrend('monthly'), getFeeCollectionTrend('yearly')])
      : Promise.resolve([null, null, null]),
    showFees ? getPendingFeesStudentCount() : Promise.resolve(0),
  ]);
  const [upcomingExams, examStats] = showExams
    ? await Promise.all([
        getAllExams().then((exams) =>
          exams
            .filter((e) => e.startDate > toLocalDateStr(new Date()))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .slice(0, 4)
        ),
        getExamDashboardStats(),
      ])
    : [[], null];
  const [dailyAttendanceTrend, monthlyAttendanceTrend, yearlyAttendanceTrend] = showAttendance
    ? await Promise.all([
        getAttendanceCollectionTrend('daily'),
        getAttendanceCollectionTrend('monthly'),
        getAttendanceCollectionTrend('yearly'),
      ])
    : [null, null, null];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Good to see you, {displayName}</h1>

      {(showStudents || showTeachers || showFees || showAttendance) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {showStudents && (
            <TotalStudentsKPICard
              value={stats.totalStudents.value.toLocaleString()}
              classWise={stats.totalStudents.classWise}
            />
          )}
          {showTeachers && (
            <KPICard
              label="Total Teachers"
              icon={<FiUser className="w-4 h-4" />}
              value={stats.totalTeachers.value.toLocaleString()}
              footer={
                <Link href="/dashboard/teachers" className="flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white">
                  View All Teachers
                  <FiArrowRight className="w-3 h-3" />
                </Link>
              }
            />
          )}
          {showFees && (
            <KPICard
              label="Pending Fees"
              icon={<FiCreditCard className="w-4 h-4" />}
              value={`₹${feesStats.pending.toLocaleString('en-IN')}`}
              context={`${pendingFeesStudentCount} student${pendingFeesStudentCount === 1 ? '' : 's'}`}
            />
          )}
          {showAttendance && (
            <KPICard
              label="Today's Attendance"
              icon={<FiCheckSquare className="w-4 h-4" />}
              value={attendanceToday ? `${attendanceToday.percent}%` : '—'}
              pillLabel={
                attendanceWeekly?.trendVsLastWeek != null
                  ? `${attendanceWeekly.trendVsLastWeek > 0 ? '+' : ''}${attendanceWeekly.trendVsLastWeek}%`
                  : null
              }
            />
          )}
        </div>
      )}

      <QuickActions permissions={permissions} />

      {(showAttendance || showFees) && (
        <div className={`grid grid-cols-1 gap-4 ${showAttendance && showFees ? 'lg:grid-cols-2' : ''}`}>
          {showFees && (
            <FeeCollectionChart dailyData={dailyFeeTrend} monthlyData={monthlyFeeTrend} yearlyData={yearlyFeeTrend} />
          )}
          {showAttendance && (
            <AttendanceCollectionChart
              dailyData={dailyAttendanceTrend}
              monthlyData={monthlyAttendanceTrend}
              yearlyData={yearlyAttendanceTrend}
            />
          )}
        </div>
      )}

      {(showFees || showExams) && (
        <div className={`grid grid-cols-1 gap-4 ${showFees && showExams ? 'lg:grid-cols-2' : ''}`}>
          {showFees && <FeeDefaultersCard rows={defaulters} />}
          {showExams && <UpcomingExamsCard exams={upcomingExams} stats={examStats} />}
        </div>
      )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {checkInStatus && <TeacherCheckInCard initialStatus={checkInStatus} />}
        <MyClassesCard classRows={classRows} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <TeacherStatTile
          label="My Classes"
          value={stats.totalClasses}
          icon={<FiFileText className="w-4 h-4" />}
          tone="violet"
        />
        <TeacherStatTile
          label="My Students"
          value={stats.totalStudents}
          icon={<FiUsers className="w-4 h-4" />}
          tone="blue"
        />
        <TeacherStatTile
          label="Today's Attendance"
          value={`${stats.attendanceMarkedCount}/${stats.attendanceTotal}`}
          icon={<FiCheckSquare className="w-4 h-4" />}
          tone="green"
        />
        <TeacherStatTile
          label="Active Homework"
          value={stats.activeHomeworkCount}
          icon={<FiBook className="w-4 h-4" />}
          tone="amber"
        />
      </div>

      <TeacherQuickLists recentNotices={recentNotices} upcomingHomework={upcomingHomework} />
    </div>
  );
}

const STAT_TILE_TONE = {
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
};

// Same pastel-tile convention as the Students Report dashboards (Monthly/
// Yearly/Subject Tests) — icon in its own tint circle, small uppercase
// label, big bold number, no border/shadow chrome needed on a light bg.
function TeacherStatTile({ label, value, icon, tone }) {
  return (
    <div className={`rounded-2xl p-5 ${STAT_TILE_TONE[tone]}`}>
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/70 shrink-0">{icon}</span>
      <p className="text-xs font-medium uppercase tracking-wide mt-3 opacity-80">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
