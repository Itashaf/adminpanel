import AddStudentForm from '@/components/students/AddStudentForm';
import { getClassOptions } from '@/lib/students';
import { blockIfTeacher } from '@/lib/roleGuard';

export const metadata = {
  title: 'Add Student | SchoolApp 360',
};

export default async function AddStudentPage() {
  await blockIfTeacher('/dashboard/students');

  const classOptions = await getClassOptions();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Student</h1>
        <p className="text-sm text-gray-500 mt-1">Register a new student to your school.</p>
      </div>

      <AddStudentForm classOptions={classOptions} />
    </div>
  );
}
