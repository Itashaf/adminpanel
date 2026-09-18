import { notFound } from 'next/navigation';
import EditStudentForm from '@/components/students/EditStudentForm';
import { getStudentById, getClassOptions } from '@/lib/students';
import { blockIfTeacher } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const student = await getStudentById(id, await resolveSchoolId());
  return { title: student ? `Edit ${student.firstName} ${student.lastName} | SchoolApp 360` : 'Edit Student | SchoolApp 360' };
}

export default async function EditStudentPage({ params }) {
  const { id } = await params;
  await blockIfTeacher(`/dashboard/students/${id}`);

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
