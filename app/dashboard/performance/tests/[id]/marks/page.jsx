import { notFound } from 'next/navigation';
import TestMarksEntry from '@/components/performance/TestMarksEntry';
import { getSubjectTestById } from '@/lib/performance/subjectTests';
import { getCurrentRBACUser } from '@/lib/rbac';

export const metadata = {
  title: 'Enter Marks | SchoolApp 360',
};

export const dynamic = 'force-dynamic';

export default async function TestMarksPage({ params }) {
  const { id } = await params;

  const rbacUser = await getCurrentRBACUser();
  const can = {
    view: !rbacUser || rbacUser.permissions.has('performanceReports.view'),
    manage: !rbacUser || rbacUser.permissions.has('performanceReports.tests.manage'),
  };
  if (!can.view) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-sm text-gray-400">
        You don&apos;t have access to Subject Tests.
      </div>
    );
  }

  const test = await getSubjectTestById(id);
  if (!test) notFound();

  return <TestMarksEntry test={test} canManage={can.manage} />;
}
