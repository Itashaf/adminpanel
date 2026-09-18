import ExamDashboardClient from '@/components/exams/ExamDashboardClient';
import { getExamDashboardStats, getExamTypeOptions } from '@/lib/exams';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { blockIfTeacher } from '@/lib/roleGuard';

export const metadata = {
  title: 'Exam Dashboard | SchoolApp 360',
};

export default async function ExamDashboardPage() {
  await blockIfTeacher();
  const [stats, sessions, activeSession, examTypeOptions] = await Promise.all([
    getExamDashboardStats(),
    getAllSessions(),
    getActiveSession(),
    getExamTypeOptions(),
  ]);

  return (
    <ExamDashboardClient
      stats={stats}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      examTypeOptions={examTypeOptions}
    />
  );
}
