import BulkImportWizard from '@/components/performance/BulkImportWizard';
import { getClassOptions } from '@/lib/students';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentRBACUser } from '@/lib/rbac';

export const metadata = {
  title: 'Bulk Import Monthly Reports | SchoolApp 360',
};

export const dynamic = 'force-dynamic';

export default async function MonthlyImportPage() {
  const rbacUser = await getCurrentRBACUser();
  if (rbacUser && !rbacUser.permissions.has('performanceReports.monthly.manage')) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        You don&apos;t have access to import Monthly Reports.
      </div>
    );
  }

  const [classOptions, sessions, activeSession] = await Promise.all([getClassOptions(), getAllSessions(), getActiveSession()]);

  return (
    <BulkImportWizard
      classOptions={classOptions}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultAcademicSession={activeSession?.name || sessions[0]?.name || ''}
    />
  );
}
