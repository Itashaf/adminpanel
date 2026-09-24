import StudentListHeader from '@/components/students/StudentListHeader';
import StudentListReport from '@/components/students/StudentListReport';
import { getAllStudents, getClassOptions } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Student List | SchoolApp 360',
};

export default async function StudentListPage() {
  const [allStudents, allClassOptions, currentUser] = await Promise.all([
    getAllStudents(await resolveSchoolId()),
    getClassOptions(),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
  ]);

  const canManage = currentUser.role !== 'Teacher';
  // Class Teacher scope only — same as /dashboard/students (see
  // app/dashboard/students/page.jsx): a Teacher can only print the roster
  // for a class they're the Class Teacher of, not one they merely teach a
  // subject in.
  const teacherScope = canManage ? [] : currentUser.classTeacherOf || [];
  const students = canManage ? allStudents : allStudents.filter((student) => isStudentInTeacherScope(student, teacherScope));
  const classOptions = canManage
    ? allClassOptions
    : allClassOptions.filter((option) => teacherScope.some((a) => a.class === option.value));

  return (
    <div className="space-y-6">
      <StudentListHeader />
      <StudentListReport students={students} classOptions={classOptions} />
    </div>
  );
}
