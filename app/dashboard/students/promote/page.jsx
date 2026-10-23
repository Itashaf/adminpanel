import PromoteStudentsExplorer from '@/components/students/PromoteStudentsExplorer';
import { getClassOptions } from '@/lib/students';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'Promote Students | SchoolApp 360',
};

export default async function PromoteStudentsPage() {
  await blockIfNotAdminTier();
  const [classOptions, sessions, activeSession] = await Promise.all([
    getClassOptions(),
    getAllSessions(),
    getActiveSession(),
  ]);

  const defaultSession = activeSession?.name || sessions[0]?.name || '';
  // Promotion's whole point is moving students INTO the next academic year
  // — getAllSessions() already comes back ordered by startDate ascending,
  // so "next" is just whichever session immediately follows the active one
  // in that list. Falls back to the active session itself only when no
  // Upcoming session has been created yet (nothing better to default to).
  const activeIndex = sessions.findIndex((s) => s.name === defaultSession);
  const nextSessionName = (activeIndex >= 0 && sessions[activeIndex + 1]?.name) || defaultSession;

  return (
    <PromoteStudentsExplorer
      classOptions={classOptions}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={defaultSession}
      nextSessionName={nextSessionName}
    />
  );
}
