import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/students/ProfileHeader';
import ProfileOverviewCards from '@/components/students/ProfileOverviewCards';
import ProfileTabs from '@/components/students/ProfileTabs';
import { getStudentById, getStudentClassInfo } from '@/lib/students';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isStudentInTeacherScope } from '@/lib/roleGuard';
import { getCurrentRBACUser } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// An Accountant only needs to see and collect a student's fees, so this page gets a
// cut-down copy of the record: no Aadhaar, address, documents, other guardians or
// emergency contacts are ever sent to their browser (PRV-001).
function reduceForAccountant(student) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    initials: student.initials,
    photoUrl: student.photoUrl,
    admissionId: student.admissionId,
    class: student.class,
    section: student.section,
    academicSession: student.academicSession,
    status: student.status,
    admissionDate: student.admissionDate,
    whatsappNumber: student.whatsappNumber,
    discountType: student.discountType,
    discountValue: student.discountValue,
    discountReason: student.discountReason,
    guardian: student.guardian
      ? { relationship: student.guardian.relationship, fullName: student.guardian.fullName, phone: student.guardian.phone, email: student.guardian.email }
      : undefined,
  };
}

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

  const classInfo = await getStudentClassInfo(student, schoolId);

  const viewStudent = rbacUser?.roleKey === 'Accountant' ? reduceForAccountant(student) : student;

  return (
    <div className="space-y-4 sm:space-y-6">
      <ProfileHeader student={viewStudent} canManage={canManage} canEdit={canEditStudent} />
      <ProfileOverviewCards student={viewStudent} />
      <ProfileTabs student={viewStudent} initialTab={tab} canManage={canManage} roleKey={rbacUser?.roleKey} classInfo={classInfo} />
    </div>
  );
}
