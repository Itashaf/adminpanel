import NoticesExplorer from '@/components/notices/NoticesExplorer';
import { getVisibleNotices } from '@/lib/notices';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'Notices | SchoolApp 360',
};

export default async function NoticesPage() {
  // Real session first — see app/dashboard/homework/page.jsx's identical
  // fix: the dashboard-toggle fallback never carries classTeacherOf, which
  // left a Class-Teacher-only teacher (no subject assignments) seeing no
  // notices for their own homeroom.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
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
