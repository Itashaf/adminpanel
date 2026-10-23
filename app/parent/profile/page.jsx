import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import ParentProfileView from '@/components/parent/ParentProfileView';

export const metadata = {
  title: 'My Child | SchoolApp 360 Parent Portal',
};

export default async function ParentProfilePage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  return <ParentProfileView student={student} />;
}
