import { notFound } from 'next/navigation';
import ExamVerificationClient from '@/components/exams/ExamVerificationClient';
import { getExamById } from '@/lib/exams';
import { blockIfTeacher } from '@/lib/roleGuard';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const exam = await getExamById(id);
  return { title: exam ? `Verify Marks — ${exam.name} | SchoolApp 360` : 'Exam | SchoolApp 360' };
}

export default async function ExamVerificationPage({ params }) {
  await blockIfTeacher();
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) notFound();

  return <ExamVerificationClient exam={exam} />;
}
