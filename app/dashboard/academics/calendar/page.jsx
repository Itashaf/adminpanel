import CalendarExplorer from '@/components/calendar/CalendarExplorer';
import { getAllCalendarEvents } from '@/lib/calendarEvents';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';

export const metadata = {
  title: 'Academic Calendar | SchoolApp 360',
};

export default async function AcademicCalendarPage() {
  const [events, sessions, activeSession] = await Promise.all([
    getAllCalendarEvents(),
    getAllSessions(),
    getActiveSession(),
  ]);

  return (
    <CalendarExplorer
      events={events}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
    />
  );
}
