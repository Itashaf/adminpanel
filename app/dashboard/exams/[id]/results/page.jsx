import { notFound } from 'next/navigation';
import ExamResultsClient from '@/components/exams/ExamResultsClient';
import { getExamById } from '@/lib/exams';
import { getExamResults } from '@/lib/examResults';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfTeacher } from '@/lib/roleGuard';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const exam = await getExamById(id);
  return { title: exam ? `Results — ${exam.name} | SchoolApp 360` : 'Exam | SchoolApp 360' };
}

export default async function ExamResultsPage({ params }) {
  await blockIfTeacher();
  const { id } = await params;
  const [exam, results, school] = await Promise.all([getExamById(id), getExamResults(id), getSchoolSettings()]);
  if (!exam) notFound();

  const parentExam = exam.parentExamId ? await getExamById(exam.parentExamId) : null;

  return <ExamResultsClient exam={exam} initialResults={results} parentExam={parentExam} school={school} />;
}
