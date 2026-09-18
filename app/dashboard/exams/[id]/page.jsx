import { notFound } from 'next/navigation';
import ExamDetailsClient from '@/components/exams/ExamDetailsClient';
import { getExamById, getExamTypeOptions } from '@/lib/exams';
import { getClassTeacherScopeForExam } from '@/lib/examSchedules';
import { getMarksEntryProgress, getExamVerificationSummary } from '@/lib/examMarks';
import { getExamResults } from '@/lib/examResults';
import { getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const exam = await getExamById(id);
  return { title: exam ? `${exam.name} | SchoolApp 360` : 'Exam | SchoolApp 360' };
}

export default async function ExamDetailsPage({ params }) {
  const { id } = await params;
  // See app/dashboard/marks-entry/page.jsx's comment — a real signed-in
  // session must win over lib/currentUser.js's process-wide demo toggle.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const [exam, sessions, examTypeOptions] = await Promise.all([getExamById(id), getAllSessions(), getExamTypeOptions()]);

  if (!exam) notFound();

  const isAdmin = currentUser.role === 'SchoolAdmin' || currentUser.role === 'SuperAdmin';
  const classTeacherScope = isAdmin ? [] : await getClassTeacherScopeForExam(exam, currentUser);
  // A Teacher reaching this page must actually be the Class Teacher of at
  // least one class this exam covers — not just any signed-in Teacher, and
  // not a subject-only assignment either (that's what Marks Entry is for).
  // Guessing another exam's id gets a 404, same as any other exam a Teacher
  // has no business seeing.
  if (!isAdmin && classTeacherScope.length === 0) notFound();

  const [progress, verificationSummary, results] = isAdmin
    ? await Promise.all([getMarksEntryProgress(id), getExamVerificationSummary(id), getExamResults(id)])
    : [[], { totalSchedules: 0, approvedSchedules: 0, pendingReviewSchedules: 0 }, []];
  const hasPublishedResults = results.some((r) => r.status === 'Published');

  return (
    <ExamDetailsClient
      exam={exam}
      progress={progress}
      verificationSummary={verificationSummary}
      hasPublishedResults={hasPublishedResults}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      examTypeOptions={examTypeOptions}
      role={currentUser.role}
      classTeacherScope={classTeacherScope}
    />
  );
}
