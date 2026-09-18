import { notFound } from 'next/navigation';
import EditTeacherForm from '@/components/teachers/EditTeacherForm';
import { getTeacherById } from '@/lib/teachers';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const teacher = await getTeacherById(id, await resolveSchoolId());
  return { title: teacher ? `Edit ${teacher.firstName} ${teacher.lastName} | SchoolApp 360` : 'Edit Teacher | SchoolApp 360' };
}

export default async function EditTeacherPage({ params }) {
  const { id } = await params;
  const teacher = await getTeacherById(id, await resolveSchoolId());

  if (!teacher) notFound();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update {teacher.firstName} {teacher.lastName}&apos;s information.
        </p>
      </div>

      <EditTeacherForm teacher={teacher} />
    </div>
  );
}
