import ExamsExplorer from '@/components/exams/ExamsExplorer';
import { getVisibleExams, getExamTypeOptions } from '@/lib/exams';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';

export const metadata = {
  title: 'Manage Exams | SchoolApp 360',
};

export default async function ExamsListPage() {
  // See app/dashboard/marks-entry/page.jsx's comment — a real signed-in
  // session must win over lib/currentUser.js's process-wide demo toggle, or
  // an Admin's exam list can end up wrongly scoped to whichever Teacher last
  // logged in anywhere on this server.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const [exams, sessions, activeSession, examTypeOptions] = await Promise.all([
    getVisibleExams(currentUser),
    getAllSessions(),
    getActiveSession(),
    getExamTypeOptions(),
  ]);

  return (
    <ExamsExplorer
      exams={exams}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      examTypeOptions={examTypeOptions}
      role={currentUser.role}
    />
  );
}
