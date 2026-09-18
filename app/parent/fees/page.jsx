import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import ParentFeesView from '@/components/parent/ParentFeesView';

export const metadata = {
  title: 'My Fees | SchoolApp 360 Parent Portal',
};

export default async function ParentFeesPage() {
  // Layout already redirects a non-Parent session — re-resolved here (not
  // passed down) since Next's App Router has no built-in way to hand data
  // from a layout to its page, and this is cheap enough not to matter.
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  return <ParentFeesView student={student} />;
}
