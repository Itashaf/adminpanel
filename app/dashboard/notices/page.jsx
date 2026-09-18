import NoticesExplorer from '@/components/notices/NoticesExplorer';
import { getVisibleNotices } from '@/lib/notices';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';

export const metadata = {
  title: 'Notices | SchoolApp 360',
};

export default async function NoticesPage() {
  const currentUser = await getCurrentUser();
  const [notices, sessions, activeSession] = await Promise.all([
    getVisibleNotices(currentUser),
    getAllSessions(),
    getActiveSession(),
  ]);

  return (
    <NoticesExplorer
      notices={notices}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      currentUser={currentUser}
    />
  );
}
