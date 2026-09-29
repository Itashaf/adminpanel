import StudentsExplorer from '@/components/students/StudentsExplorer';
import { getStudentsPage, getStudentStats, getClassOptions } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';
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
  // Add Student / Bulk Import buttons: canManage above is scope (Teacher's
  // own classes vs whole school), not create permission — Accountant is
  // also `role !== 'Teacher'` (legacy-shape fallback, see lib/iam.js) but
  // has no students.create (prisma/rbacPermissions.js). Real permission
  // check for the buttons specifically; POST /api/students already
  // enforces this server-side regardless (see app/api/students/route.js).
  const rbacUser = await getCurrentRBACUser();
  const canCreateStudents = rbacUser ? rbacUser.permissions.has('students.create') : canManage;
  // Same gap for the per-row Edit action — Accountant has students.view
  // only, not students.update.
  const canUpdateStudents = rbacUser ? rbacUser.permissions.has('students.update') : canManage;
  // A Teacher only ever sees students in a class they're the Class Teacher
  // of (Section.classTeacherId) — deliberately currentUser.classTeacherOf
  // directly, not getTeacherClassScope's merged assignments+classTeacherOf:
  // being assigned a subject in a class doesn't grant that class's roster.
  // Enforced at the query itself (see lib/students.js's getStudentsPage
  // `scopePairs`), not by fetching the whole school's roster and filtering
  // it in JS.
  const scopePairs = canManage ? null : currentUser.classTeacherOf || [];

  // A Class Teacher lands on their own class already selected, not "All
  // Classes" — same scope as scopePairs above (Section.classTeacherId, not
  // subject assignments), just reflected in the filter UI instead of only
  // the query. A URL param always wins (a bookmarked/shared link), and a
  // Teacher who's Class Teacher of more than one section still starts
  // unfiltered — there's no single "own class" to default to.
  const ownClass = scopePairs?.length === 1 ? scopePairs[0] : null;

  const initialFilters = {
    search: '',
    class: params?.class || ownClass?.class || '',
    section: params?.section || ownClass?.section || '',
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
      canCreate={canCreateStudents}
      canEdit={canUpdateStudents}
      pageSize={PAGE_SIZE}
    />
  );
}
