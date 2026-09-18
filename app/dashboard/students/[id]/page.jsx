import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/students/ProfileHeader';
import ProfileOverviewCards from '@/components/students/ProfileOverviewCards';
import ProfileTabs from '@/components/students/ProfileTabs';
import { getStudentById } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
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
  const [student, currentUser] = await Promise.all([
    getStudentById(id, schoolId),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
  ]);

  if (!student) notFound();

  const canManage = currentUser.role !== 'Teacher';
  // A Teacher can't reach a student outside their own classes even by typing
  // the URL directly — same "not just a hidden button" principle as the rest
  // of this restriction. Scope includes Class Teacher of, not just subject
  // assignments (see lib/roleGuard.js's getTeacherClassScope).
  if (!canManage && !isStudentInTeacherScope(student, getTeacherClassScope(currentUser))) notFound();

  return (
    <div className="space-y-6">
      <ProfileHeader student={student} canManage={canManage} />
      <ProfileOverviewCards student={student} />
      <ProfileTabs student={student} initialTab={tab} canManage={canManage} />
    </div>
  );
}
