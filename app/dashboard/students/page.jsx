import StudentsExplorer from '@/components/students/StudentsExplorer';
import { getAllStudents, getClassOptions } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Students | SchoolApp 360',
};

export default async function StudentsPage({ searchParams }) {
  const params = await searchParams;
  const schoolId = await resolveSchoolId();
  // A real signed-in session must win over lib/currentUser.js's demo toggle
  // — same fix as Attendance/Exams; it's also the only source that carries
  // classTeacherOf, which a Class Teacher needs even with no subject
  // assignment of their own.
  const [allStudents, allClassOptions, currentUser] = await Promise.all([
    getAllStudents(schoolId),
    getClassOptions(),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
  ]);

  const canManage = currentUser.role !== 'Teacher';
  const teacherScope = canManage ? [] : getTeacherClassScope(currentUser);
  // A Teacher only ever sees students in their own class+section assignments
  // (subject assignment OR Class Teacher of) — both the roster and the Class
  // filter's options are scoped, not just hidden actions, so there's nothing
  // to page through or filter into that isn't already theirs.
  const students = canManage ? allStudents : allStudents.filter((student) => isStudentInTeacherScope(student, teacherScope));
  const classOptions = canManage
    ? allClassOptions
    : allClassOptions.filter((option) => teacherScope.some((a) => a.class === option.value));

  const initialFilters = {
    class: params?.class || '',
    section: params?.section || '',
  };

  return (
    <StudentsExplorer
      students={students}
      classOptions={classOptions}
      initialFilters={initialFilters}
      canManage={canManage}
    />
  );
}
