import YearlyDashboardExplorer from '@/components/performance/YearlyDashboardExplorer';
import { getClassOptions } from '@/lib/students';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getCurrentRBACUser } from '@/lib/rbac';

export const metadata = {
  title: 'Yearly Reports | SchoolApp 360',
};

export const dynamic = 'force-dynamic';

export default async function YearlyReportDashboardPage() {
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

  const [classOptions, sessions, activeSession, school] = await Promise.all([
    getClassOptions(),
    getAllSessions(),
    getActiveSession(),
    getSchoolSettings(),
  ]);

  return (
    <YearlyDashboardExplorer
      classOptions={classOptions}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultAcademicSession={activeSession?.name || sessions[0]?.name || ''}
      canManage={can.manage}
      school={school}
    />
  );
}
