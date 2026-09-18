import StudentsExplorer from '@/components/students/StudentsExplorer';
import { getStudentsPage, getStudentStats, getClassOptions } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getTeacherClassScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Students | SchoolApp 360',
};

const PAGE_SIZE = 10;

export default async function StudentsPage({ searchParams }) {
  const params = await searchParams;
  const schoolId = await resolveSchoolId();
  // A real signed-in session must win over lib/currentUser.js's demo toggle
  // — same fix as Attendance/Exams; it's also the only source that carries
  // classTeacherOf, which a Class Teacher needs even with no subject
  // assignment of their own.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const canManage = currentUser.role !== 'Teacher';
  // A Teacher only ever sees students in their own class+section assignments
  // (subject assignment OR Class Teacher of) — enforced at the query itself
  // (see lib/students.js's getStudentsPage `scopePairs`), not by fetching
  // the whole school's roster and filtering it in JS.
  const scopePairs = canManage ? null : getTeacherClassScope(currentUser);

  const initialFilters = {
    search: '',
    class: params?.class || '',
    section: params?.section || '',
    status: '',
  };

  const [allClassOptions, stats, page1] = await Promise.all([
    getClassOptions(),
    getStudentStats(schoolId, scopePairs),
    getStudentsPage({
      schoolId,
      page: 1,
      pageSize: PAGE_SIZE,
      classFilter: initialFilters.class,
      sectionFilter: initialFilters.section,
      scopePairs,
    }),
  ]);

  const classOptions = canManage
    ? allClassOptions
    : allClassOptions.filter((option) => scopePairs.some((a) => a.class === option.value));

  return (
    <StudentsExplorer
      initialStudents={page1.students}
      initialTotal={page1.total}
      stats={stats}
      classOptions={classOptions}
      initialFilters={initialFilters}
      canManage={canManage}
      pageSize={PAGE_SIZE}
    />
  );
}
