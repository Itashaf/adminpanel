import { redirect } from 'next/navigation';
import ParentExamHomeView from '@/components/parent/ParentExamHomeView';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getVisibleExams } from '@/lib/exams';
import { getPublishedResultsForStudent } from '@/lib/examResults';

export const metadata = {
  title: 'Exams | SchoolApp 360 Parent Portal',
};

export default async function ParentExamsPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');
  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  // A Draft exam is still being configured by the admin — nothing for a
  // parent to usefully see yet, so it's filtered out here (unlike
  // getVisibleExams's Teacher/Admin branches, which do need to see Drafts).
  const [allExams, results] = await Promise.all([getVisibleExams(actor), getPublishedResultsForStudent(student.id)]);
  const exams = allExams.filter((exam) => exam.status !== 'Draft');

  const today = new Date().toISOString().slice(0, 10);
  const nextExam = exams
    .filter((exam) => exam.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;

  return <ParentExamHomeView exams={exams} nextExam={nextExam} latestResult={results[0] || null} student={student} />;
}
