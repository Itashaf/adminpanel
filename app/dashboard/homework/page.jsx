import HomeworkExplorer from '@/components/homework/HomeworkExplorer';
import { getVisibleHomework } from '@/lib/homework';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';

export const metadata = {
  title: 'Homework | SchoolApp 360',
};

export default async function HomeworkPage() {
  const currentUser = await getCurrentUser();
  const [homework, sessions, activeSession] = await Promise.all([
    getVisibleHomework(currentUser),
    getAllSessions(),
    getActiveSession(),
  ]);

  return (
    <HomeworkExplorer
      homework={homework}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      currentUser={currentUser}
    />
  );
}
