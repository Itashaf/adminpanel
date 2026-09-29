import { redirect } from 'next/navigation';
import MonthlyReportForm from '@/components/performance/MonthlyReportForm';
import { getMonthlyReport } from '@/lib/performance/monthlyReports';
import { getActiveSession, getAllSessions } from '@/lib/academicSessions';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getSubjects } from '@/lib/subjects';
import { getAllTeachers } from '@/lib/teachers';
import { getCurrentRBACUser } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const dynamic = 'force-dynamic';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function MonthlyStudentReportPage({ params, searchParams }) {
  const { studentId } = await params;
  const sp = await searchParams;

  const rbacUser = await getCurrentRBACUser();
  const can = {
    view: !rbacUser || rbacUser.permissions.has('performanceReports.view'),
    manage: !rbacUser || rbacUser.permissions.has('performanceReports.monthly.manage'),
  };
  if (!can.view) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        You don&apos;t have access to Monthly Reports.
      </div>
    );
  }

  const [activeSession, sessions, school] = await Promise.all([getActiveSession(), getAllSessions(), getSchoolSettings()]);
  const academicSession = sp?.academicSession || activeSession?.name || sessions[0]?.name || '';
  const month = sp?.month || currentMonth();

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const isTeacher = currentUser.role === 'Teacher';

  let report;
  try {
    report = await getMonthlyReport(currentUser, studentId, academicSession, month);
  } catch (err) {
    // Not the Class Teacher for this student's class/section, or student
    // not found — never render the form (would leak the student's data to
    // someone the scope check just rejected).
    redirect('/dashboard/performance/monthly');
  }

  const canManageTests = !rbacUser || rbacUser.permissions.has('performanceReports.tests.manage');
  const [subjects, teachers] = await Promise.all([
    canManageTests ? getSubjects() : Promise.resolve([]),
    canManageTests && !isTeacher ? getAllTeachers(await resolveSchoolId()) : Promise.resolve([]),
  ]);

  return (
    <MonthlyReportForm
      report={report}
      academicSession={academicSession}
      month={month}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      canManage={can.manage}
      school={school}
      canManageTests={canManageTests}
      isTeacher={isTeacher}
      subjects={subjects.map((s) => ({ value: s.id, label: s.name }))}
      teacherOptions={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
    />
  );
}
