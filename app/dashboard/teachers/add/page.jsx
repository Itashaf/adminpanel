import AddTeacherForm from '@/components/teachers/AddTeacherForm';

export const metadata = {
  title: 'Add Teacher | SchoolApp 360',
};

export default function AddTeacherPage() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Teacher</h1>
        <p className="text-sm text-gray-500 mt-1">Register a new teacher to your school.</p>
      </div>

      <AddTeacherForm />
    </div>
  );
}
