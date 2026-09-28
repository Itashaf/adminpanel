import { notFound, redirect } from 'next/navigation';
import EditStudentForm from '@/components/students/EditStudentForm';
import { getStudentById, getClassOptions } from '@/lib/students';
import { blockIfTeacher } from '@/lib/roleGuard';
import { getCurrentRBACUser } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const student = await getStudentById(id, await resolveSchoolId());
  return { title: student ? `Edit ${student.firstName} ${student.lastName} | SchoolApp 360` : 'Edit Student | SchoolApp 360' };
}

export default async function EditStudentPage({ params }) {
  const { id } = await params;
  await blockIfTeacher(`/dashboard/students/${id}`);

  // blockIfTeacher only rules out Teacher — Accountant also passes that
  // check (legacy-role fallback tags it 'SchoolAdmin', see lib/iam.js) but
  // only holds students.view, not students.update. Without this, the page
  // rendered the full edit form (Aadhaar number, contact info, etc.) before
  // the PUT itself 403'd on submit — real permission check before
  // fetching/rendering anything, same fix as the Add Student button gap.
  const rbacUser = await getCurrentRBACUser();
  if (rbacUser && !rbacUser.permissions.has('students.update')) {
    redirect(`/dashboard/students/${id}`);
  }

  const schoolId = await resolveSchoolId();
  const [student, classOptions] = await Promise.all([getStudentById(id, schoolId), getClassOptions()]);

  if (!student) notFound();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update {student.firstName} {student.lastName}&apos;s information.
        </p>
      </div>

      <EditStudentForm student={student} classOptions={classOptions} />
    </div>
  );
}
