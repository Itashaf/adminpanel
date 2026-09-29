import { redirect } from 'next/navigation';
import YearlyReportView from '@/components/performance/YearlyReportView';
import { getYearlyReport } from '@/lib/performance/yearlyReports';
import { getActiveSession, getAllSessions } from '@/lib/academicSessions';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getCurrentRBACUser } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export const dynamic = 'force-dynamic';

export default async function YearlyStudentReportPage({ params, searchParams }) {
  const { studentId } = await params;
  const sp = await searchParams;

  const rbacUser = await getCurrentRBACUser();
  const can = {
    view: !rbacUser || rbacUser.permissions.has('performanceReports.view'),
    manage: !rbacUser || rbacUser.permissions.has('performanceReports.yearly.manage'),
  };
  if (!can.view) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        You don&apos;t have access to Yearly Reports.
      </div>
    );
  }

  const [activeSession, sessions, school] = await Promise.all([getActiveSession(), getAllSessions(), getSchoolSettings()]);
  const academicSession = sp?.academicSession || activeSession?.name || sessions[0]?.name || '';

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());

  let report;
  try {
    report = await getYearlyReport(currentUser, studentId, academicSession);
  } catch (err) {
    redirect('/dashboard/performance/yearly');
  }

  return (
    <YearlyReportView
      report={report}
      academicSession={academicSession}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      canManage={can.manage}
      school={school}
    />
  );
}
