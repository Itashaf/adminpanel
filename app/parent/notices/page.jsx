import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getNoticesPageForStudent } from '@/lib/notices';
import ParentNoticesView from '@/components/parent/ParentNoticesView';

export const metadata = {
  title: 'Notices | SchoolApp 360 Parent Portal',
};

const PAGE_SIZE = 10;

export default async function ParentNoticesPage({ searchParams }) {
  const params = await searchParams;
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  // The first page is fetched here (so there's no loading flash); later pages
  // come from /api/parent/notices (see ParentNoticesView).
  const initialResult = await getNoticesPageForStudent(student, actor.id, {
    page: Math.max(Number(params?.page) || 1, 1),
    pageSize: PAGE_SIZE,
  });

  return <ParentNoticesView initialResult={initialResult} pageSize={PAGE_SIZE} student={student} />;
}
