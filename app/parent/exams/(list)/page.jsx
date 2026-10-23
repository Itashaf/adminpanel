import { redirect } from 'next/navigation';
import ParentExamHomeView from '@/components/parent/ParentExamHomeView';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getExamsPageForStudent, getExamSummaryForStudent } from '@/lib/exams';
import { getPublishedResultsForStudent } from '@/lib/examResults';

export const metadata = {
  title: 'Exams | SchoolApp 360 Parent Portal',
};

const PAGE_SIZE = 10;

export default async function ParentExamsPage({ searchParams }) {
  const params = await searchParams;
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');
  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  // Only this child's own class/session exams — never a Draft, and never one
  // with no date sheet for their class (see lib/exams.js's parentExamWhere).
  // The first page is fetched here (no loading flash); later pages come from
  // /api/parent/exams (see ParentExamHomeView).
  const [initialResult, summary, results] = await Promise.all([
    getExamsPageForStudent(student, { page: Math.max(Number(params?.page) || 1, 1), pageSize: PAGE_SIZE }),
    getExamSummaryForStudent(student),
    getPublishedResultsForStudent(student.id),
  ]);

  return (
    <ParentExamHomeView
      initialResult={initialResult}
      pageSize={PAGE_SIZE}
      summary={summary}
      latestResult={results[0] || null}
      student={student}
    />
  );
}
