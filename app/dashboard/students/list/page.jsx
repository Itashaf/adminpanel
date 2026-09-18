import StudentListHeader from '@/components/students/StudentListHeader';
import StudentListReport from '@/components/students/StudentListReport';
import { getAllStudents, getClassOptions } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
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
  const teacherScope = canManage ? [] : getTeacherClassScope(currentUser);
  // Same scoping as /dashboard/students (see app/dashboard/students/page.jsx)
  // — a Teacher can only print the roster for classes they're actually
  // assigned to or the Class Teacher of, not the whole school's.
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
