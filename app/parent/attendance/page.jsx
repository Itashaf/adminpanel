import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import StudentAttendanceTab from '@/components/students/StudentAttendanceTab';

export const metadata = {
  title: 'Attendance | SchoolApp 360 Parent Portal',
};

// Just the attendance calendar/stats — no tab bar, no other profile
// details. See app/parent/profile/page.jsx for the fuller Overview/
// Academic/Attendance tabbed view; this is its own standalone page for the
// "Attendance" nav item specifically.
export default async function ParentAttendancePage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          {student.firstName} {student.lastName} — {student.class}
          {student.section ? ` - ${student.section}` : ''}
        </p>
      </div>
      <StudentAttendanceTab studentId={student.id} admissionDate={student.admissionDate} />
    </div>
  );
}
