import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getHomeworkPageForStudent } from '@/lib/homework';
import ParentHomeworkView from '@/components/parent/ParentHomeworkView';

export const metadata = {
  title: 'Homework | SchoolApp 360 Parent Portal',
};

const PAGE_SIZE = 10;

export default async function ParentHomeworkPage({ searchParams }) {
  const params = await searchParams;
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  // Filters/page live in the URL so a refresh or shared link lands on the
  // same view — the first page is fetched here (no loading flash), later
  // pages/filters come from /api/parent/homework (see ParentHomeworkView).
  const initialResult = await getHomeworkPageForStudent(student, {
    search: params?.search || '',
    subject: params?.subject || '',
    page: Math.max(Number(params?.page) || 1, 1),
    pageSize: PAGE_SIZE,
  });

  return <ParentHomeworkView initialResult={initialResult} pageSize={PAGE_SIZE} student={student} />;
}
