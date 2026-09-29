import CalendarExplorer from '@/components/calendar/CalendarExplorer';
import TeacherCalendarView from '@/components/calendar/TeacherCalendarView';
import { getAllCalendarEvents } from '@/lib/calendarEvents';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'Academic Calendar | SchoolApp 360',
};

export default async function AcademicCalendarPage() {
  const currentUser = await getCurrentUserInfo();

  // A Teacher gets a read-only view of the same whole-school events (only
  // isVisible ones, same filter as app/api/teacher/calendar-events) — no
  // Add/Edit drawer, that authoring surface stays Admin-tier only.
  if (currentUser?.role === 'Teacher') {
    const allEvents = await getAllCalendarEvents(currentUser.schoolId);
    return <TeacherCalendarView events={allEvents.filter((e) => e.isVisible)} />;
  }

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
