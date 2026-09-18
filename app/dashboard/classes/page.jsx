import ClassesExplorer from '@/components/classes/ClassesExplorer';
import { getClassesForSession } from '@/lib/classes';
import { ACADEMIC_SESSIONS } from '@/lib/students';
import { getActiveSession } from '@/lib/academicSessions';

export const metadata = {
  title: 'Classes & Sections | SchoolApp 360',
};

export default async function ClassesPage() {
  // No longer a page-level filter — the school-wide active academic session
  // (switched via the Topbar dropdown) is the single source of truth, same
  // as Attendance/Reports.
  const activeSession = await getActiveSession();
  const selectedSession = activeSession?.name || ACADEMIC_SESSIONS[0];

  const classes = await getClassesForSession(selectedSession);

  return <ClassesExplorer classes={classes} selectedSession={selectedSession} />;
}
