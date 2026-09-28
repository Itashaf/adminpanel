import SubjectTestsExplorer from '@/components/performance/SubjectTestsExplorer';
import { getClassOptions } from '@/lib/students';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getSubjects } from '@/lib/subjects';
import { getAllTeachers } from '@/lib/teachers';
import { getCurrentRBACUser } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Subject Tests | SchoolApp 360',
};

export const dynamic = 'force-dynamic';

export default async function SubjectTestsPage() {
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

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const isTeacher = currentUser.role === 'Teacher';

  const [classOptions, sessions, activeSession, subjects, teachers] = await Promise.all([
    getClassOptions(),
    getAllSessions(),
    getActiveSession(),
    getSubjects(),
    // Admin/Principal/SuperAdmin creating a test need to attribute it to a
    // real teacher (no session of their own to default to) — a Teacher
    // never sees this list, they always create as themselves.
    isTeacher ? Promise.resolve([]) : getAllTeachers(await resolveSchoolId()),
  ]);

  return (
    <SubjectTestsExplorer
      classOptions={classOptions}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultAcademicSession={activeSession?.name || sessions[0]?.name || ''}
      subjects={subjects.map((s) => ({ value: s.id, label: s.name }))}
      teacherOptions={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
      canManage={can.manage}
      isTeacher={isTeacher}
    />
  );
}
