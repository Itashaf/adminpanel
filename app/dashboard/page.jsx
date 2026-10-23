import Link from 'next/link';
import { FiUsers, FiUser, FiCheckSquare, FiBook, FiCreditCard, FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import StatCard from '@/components/dashboard/StatCard';
import KPICard from '@/components/dashboard/KPICard';
import TotalStudentsKPICard from '@/components/dashboard/TotalStudentsKPICard';
import QuickActions from '@/components/dashboard/QuickActions';
import MobileKPITiles from '@/components/dashboard/MobileKPITiles';
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
import ParentKPICard from '@/components/parent/ParentKPICard';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import { getDashboardOverview, getTeacherDashboardOverview } from '@/lib/dashboard';
import { getPayments, getPendingFeesList, getPendingFeesStudentCount, getFeeCollectionTrends, getClasswisePendingFees } from '@/lib/fees';
import PendingFeesKPICard from '@/components/dashboard/PendingFeesKPICard';
import PendingFeesStatCard from '@/components/dashboard/PendingFeesStatCard';
import AttendanceKPICard from '@/components/dashboard/AttendanceKPICard';
import { getAllExams, getExamDashboardStats } from '@/lib/exams';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';
import { getTeacherCheckInStatus } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { toLocalDateStr, getAttendanceCollectionTrends } from '@/lib/attendance';
import { todayInSchoolTz } from '@/lib/schoolToday';

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

  const [{ stats, feesStats, attendanceToday, classWiseAttendanceToday, attendanceWeekly, snapshot }, userInfo, rbacUser] = await Promise.all([
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
    const [recentPayments, pendingFeesRows, pendingFeesStudentCount, classwisePendingFees] = await Promise.all([
      getPayments({ status: 'SUCCESS', pageSize: 5 }),
      getPendingFeesList(5),
      getPendingFeesStudentCount(),
      getClasswisePendingFees(),
    ]);
    return (
      <AccountantDashboard
        stats={stats}
        feesStats={feesStats}
        feeCollectedToday={snapshot.feeCollectedToday}
        recentPayments={recentPayments.payments}
        pendingFeesRows={pendingFeesRows}
        pendingFeesStudentCount={pendingFeesStudentCount}
        classwisePendingFees={classwisePendingFees}
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

  const [defaulters, feeTrends, pendingFeesStudentCount, classwisePendingFees] = await Promise.all([
    showFees ? getPendingFeesList(5, { onlyOverdue: true }) : Promise.resolve([]),
    showFees ? getFeeCollectionTrends() : Promise.resolve(null),
    showFees ? getPendingFeesStudentCount() : Promise.resolve(0),
    showFees ? getClasswisePendingFees() : Promise.resolve([]),
  ]);
  const dailyFeeTrend = feeTrends?.daily ?? null;
  const monthlyFeeTrend = feeTrends?.monthly ?? null;
  const yearlyFeeTrend = feeTrends?.yearly ?? null;
  const [upcomingExams, examStats] = showExams
    ? await Promise.all([
        getAllExams().then((exams) =>
          exams
            .filter((e) => e.startDate > todayInSchoolTz())
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .slice(0, 4)
        ),
        getExamDashboardStats(),
      ])
    : [[], null];
  const attendanceTrends = showAttendance ? await getAttendanceCollectionTrends() : null;
  const dailyAttendanceTrend = attendanceTrends?.daily ?? null;
  const monthlyAttendanceTrend = attendanceTrends?.monthly ?? null;
  const yearlyAttendanceTrend = attendanceTrends?.yearly ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="tracking-tight">
          <span className="block text-lg font-normal text-gray-500 sm:inline sm:text-2xl sm:font-bold sm:text-gray-900">Good to see you,</span>{' '}
          <span className="block text-3xl font-bold text-gray-900 sm:inline sm:text-2xl">{displayName}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1 sm:hidden">Here&apos;s what&apos;s happening today.</p>
      </div>

      <MobileKPITiles
        items={[
          ...(showStudents ? [{ label: 'Students', value: stats.totalStudents.value.toLocaleString(), href: '/dashboard/students', icon: <FiUsers className="w-5 h-5" /> }] : []),
          ...(showTeachers ? [{ label: 'Teachers', value: stats.totalTeachers.value.toLocaleString(), href: '/dashboard/teachers', icon: <FiUser className="w-5 h-5" /> }] : []),
          ...(showFees ? [{ label: 'Pending Fees', value: `₹${feesStats.pending.toLocaleString('en-IN')}`, href: '/dashboard/fees/students', icon: <FiCreditCard className="w-5 h-5" /> }] : []),
          ...(showAttendance ? [{ label: 'Attendance', value: attendanceToday ? `${attendanceToday.percent}%` : '—', href: '/dashboard/attendance/daily', icon: <FiTrendingUp className="w-5 h-5" /> }] : []),
        ]}
      />

      {(showStudents || showTeachers || showFees || showAttendance) && (
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <PendingFeesKPICard
              value={`₹${feesStats.pending.toLocaleString('en-IN')}`}
              context={`${pendingFeesStudentCount} student${pendingFeesStudentCount === 1 ? '' : 's'}`}
              classwise={classwisePendingFees}
            />
          )}
          {showAttendance && (
            <AttendanceKPICard
              value={attendanceToday ? `${attendanceToday.percent}%` : '—'}
              pillLabel={
                attendanceWeekly?.trendVsLastWeek != null
                  ? `${attendanceWeekly.trendVsLastWeek > 0 ? '+' : ''}${attendanceWeekly.trendVsLastWeek}%`
                  : null
              }
              classwise={classWiseAttendanceToday}
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
  classwisePendingFees,
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
        <PendingFeesStatCard
          value={`₹${feesStats.pending.toLocaleString('en-IN')}`}
          context={`Across ${pendingFeesStudentCount} student${pendingFeesStudentCount === 1 ? '' : 's'}`}
          classwise={classwisePendingFees}
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
      ? getTeacherCheckInStatus(currentUser.teacherId, await resolveSchoolId(), todayInSchoolTz())
      : null,
  ]);

  const pendingClasses = stats.attendanceTotal - stats.attendanceMarkedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xl text-gray-500">Welcome</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-0.5">{actor?.name || currentUser.name}</h1>
        </div>
        {checkInStatus && <TeacherCheckInCard initialStatus={checkInStatus} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ParentKPICard
          label="My Classes"
          icon={<HiOutlineAcademicCap className="w-5 h-5" />}
          value={stats.totalClasses}
          context={stats.totalClasses > 0 ? 'Classes you manage' : 'No classes assigned yet'}
          dotClassName="bg-sky-400"
        />
        <ParentKPICard
          label="My Students"
          icon={<FiUsers className="w-5 h-5" />}
          value={stats.totalStudents}
          context={`Across ${stats.totalClasses} class${stats.totalClasses === 1 ? '' : 'es'}`}
          dotClassName="bg-green-400"
        />
        <ParentKPICard
          label="Today's Attendance"
          icon={<FiCheckSquare className="w-5 h-5" />}
          value={`${stats.attendanceMarkedCount}/${stats.attendanceTotal}`}
          context={
            stats.attendanceTotal === 0
              ? 'No classes assigned yet'
              : pendingClasses > 0
                ? `${pendingClasses} class${pendingClasses === 1 ? '' : 'es'} pending`
                : 'All classes marked'
          }
          dotClassName={pendingClasses > 0 ? 'bg-amber-400' : 'bg-green-400'}
        />
        <ParentKPICard
          label="Active Homework"
          icon={<FiBook className="w-5 h-5" />}
          value={stats.activeHomeworkCount}
          context={upcomingHomework[0] ? `Latest: ${upcomingHomework[0].title}` : 'No homework assigned yet'}
          dotClassName="bg-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MyClassesCard classRows={classRows} />
        <TeacherQuickLists recentNotices={recentNotices} upcomingHomework={upcomingHomework} />
      </div>
    </div>
  );
}
