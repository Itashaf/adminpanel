import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getNoticesForStudent } from '@/lib/notices';
import ParentNoticesView from '@/components/parent/ParentNoticesView';

export const metadata = {
  title: 'Notices | SchoolApp 360 Parent Portal',
};

export default async function ParentNoticesPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const notices = await getNoticesForStudent(student);

  return <ParentNoticesView notices={notices} student={student} />;
}
