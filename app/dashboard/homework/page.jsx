import HomeworkExplorer from '@/components/homework/HomeworkExplorer';
import { getVisibleHomework } from '@/lib/homework';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getTeacherClassScope } from '@/lib/roleGuard';

export const metadata = {
  title: 'Homework | SchoolApp 360',
};

export default async function HomeworkPage() {
  // Real session first — carries classTeacherOf (see lib/iam.js), which a
  // Class Teacher needs even with zero subject assignments of their own.
  // The dashboard-toggle fallback (lib/currentUser.js) never has that field.
  const sessionUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  // HomeworkExplorer's own class picker reads currentUser.assignedClasses
  // directly — replacing it with the merged scope here (instead of only
  // fixing lib/homework.js's internal check) is what makes a Class
  // Teacher's own homeroom actually selectable, not just acceptable once
  // selected.
  const currentUser =
    sessionUser.role === 'Teacher' ? { ...sessionUser, assignedClasses: getTeacherClassScope(sessionUser) } : sessionUser;

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
