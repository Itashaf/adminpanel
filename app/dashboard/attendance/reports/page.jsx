import ReportsFiltersBar from '@/components/attendance/ReportsFiltersBar';
import ReportSummaryCards from '@/components/attendance/ReportSummaryCards';
import OverallAttendanceDonut from '@/components/attendance/OverallAttendanceDonut';
import AttendanceTrendChart from '@/components/attendance/AttendanceTrendChart';
import ClassAttendancePerformance from '@/components/attendance/ClassAttendancePerformance';
import StudentAttendanceReportTable from '@/components/attendance/StudentAttendanceReportTable';
import {
  getAttendanceSummary,
  getClassAttendancePerformance,
  getStudentAttendanceReport,
  getAttendanceTrend,
  toLocalDateStr,
} from '@/lib/attendance';
import { getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getTeacherClassScope } from '@/lib/roleGuard';
import { getClassSectionsMap } from '@/lib/classes';

export const metadata = {
  title: 'Attendance Reports | SchoolApp 360',
};

function firstOfMonth() {
  const now = new Date();
  return toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
}

export default async function AttendanceReportsPage({ searchParams }) {
  const params = await searchParams;
  const [sessions, currentUser, classSections] = await Promise.all([
    getAllSessions(),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
    getClassSectionsMap(),
  ]);
  const activeSession = sessions.find((s) => s.status === 'Active') || sessions[0];

  const isTeacher = currentUser.role === 'Teacher';
  // Includes classes the Teacher is only the Class Teacher of (no subject
  // assignment) — see lib/roleGuard.js's getTeacherClassScope.
  const allowedClasses = isTeacher ? [...new Set(getTeacherClassScope(currentUser).map((a) => a.class))] : null;

  const filters = {
    // No longer overridable via the filter bar or the URL — always the
    // school-wide active session, switched via the Topbar dropdown.
    session: activeSession?.name || sessions[0]?.name || '',
    class: params?.class || 'All Classes',
    section: params?.section || 'All Sections',
    gender: params?.gender || 'All',
    search: params?.search || '',
    from: params?.from || firstOfMonth(),
    to: params?.to || toLocalDateStr(new Date()),
  };

  // A teacher's report is always scoped to their own assigned classes,
  // regardless of what the URL says — the filter bar's Class dropdown
  // already only offers those, but this guards direct URL access too.
  if (isTeacher && filters.class !== 'All Classes' && !allowedClasses.includes(filters.class)) {
    filters.class = 'All Classes';
    filters.section = 'All Sections';
  }

  const classOptions = [
    { value: 'All Classes', label: 'All Classes' },
    ...(isTeacher ? allowedClasses : Object.keys(classSections)).map((c) => ({ value: c, label: c })),
  ];

  const reportFilters = {
    academicSession: filters.session,
    classFilter: filters.class,
    sectionFilter: filters.section,
    genderFilter: filters.gender,
    search: filters.search,
    from: filters.from,
    to: filters.to,
    // The Class dropdown only ever *offers* a Teacher their own classes, but
    // leaving it on "All Classes" used to fall through to the whole school —
    // this is what actually restricts the underlying query regardless of
    // what the dropdown is set to.
    allowedClasses: isTeacher ? allowedClasses : null,
  };

  const [summary, classPerformance, studentReport, trend] = await Promise.all([
    getAttendanceSummary(reportFilters),
    getClassAttendancePerformance({
      academicSession: filters.session,
      from: filters.from,
      to: filters.to,
      allowedClasses: isTeacher ? allowedClasses : null,
    }),
    getStudentAttendanceReport(reportFilters),
    getAttendanceTrend(reportFilters),
  ]);

  const visibleClassPerformance = isTeacher ? classPerformance.filter((c) => allowedClasses.includes(c.className)) : classPerformance;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-sm text-gray-500 mt-1">View attendance performance across students, classes and dates.</p>
      </div>

      <ReportsFiltersBar classOptions={classOptions} initialFilters={filters} />

      <ReportSummaryCards summary={summary} totalStudents={studentReport.length} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <OverallAttendanceDonut summary={summary} from={filters.from} to={filters.to} />
        <AttendanceTrendChart trend={trend} />
        <ClassAttendancePerformance classes={visibleClassPerformance} />
      </div>

      <StudentAttendanceReportTable rows={studentReport} />
    </div>
  );
}
