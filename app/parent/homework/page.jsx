import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getHomeworkForStudent } from '@/lib/homework';
import ParentHomeworkView from '@/components/parent/ParentHomeworkView';

export const metadata = {
  title: 'Homework | SchoolApp 360 Parent Portal',
};

export default async function ParentHomeworkPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const homework = await getHomeworkForStudent(student);

  return <ParentHomeworkView homework={homework} student={student} />;
}
