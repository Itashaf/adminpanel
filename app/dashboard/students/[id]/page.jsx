import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/students/ProfileHeader';
import ProfileOverviewCards from '@/components/students/ProfileOverviewCards';
import ProfileTabs from '@/components/students/ProfileTabs';
import { getStudentById } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope } from '@/lib/roleGuard';
import { getCurrentRBACUser } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const student = await getStudentById(id, await resolveSchoolId());
  return { title: student ? `${student.firstName} ${student.lastName} | SchoolApp 360` : 'Student | SchoolApp 360' };
}

export default async function StudentProfilePage({ params, searchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const schoolId = await resolveSchoolId();
  const [student, currentUser, rbacUser] = await Promise.all([
    getStudentById(id, schoolId),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
    getCurrentRBACUser(),
  ]);

  if (!student) notFound();

  const canManage = currentUser.role !== 'Teacher';
  // Edit Student button specifically — canManage above is Teacher-scope,
  // not students.update; Accountant is `role !== 'Teacher'` but has no
  // students.update (same gap as the Add Student button/edit page guard).
  const canEditStudent = rbacUser ? rbacUser.permissions.has('students.update') : canManage;
  // A Teacher can't reach a student outside their own classes even by typing
  // the URL directly — same "not just a hidden button" principle as the rest
  // of this restriction. Class Teacher scope only (currentUser.classTeacherOf),
  // not getTeacherClassScope's merged assignments+classTeacherOf — a subject
  // assignment doesn't grant that class's student roster.
  if (!canManage && !isStudentInTeacherScope(student, currentUser.classTeacherOf || [])) notFound();

  return (
    <div className="space-y-6">
      <ProfileHeader student={student} canManage={canManage} canEdit={canEditStudent} />
      <ProfileOverviewCards student={student} />
      <ProfileTabs student={student} initialTab={tab} canManage={canManage} roleKey={rbacUser?.roleKey} />
    </div>
  );
}
