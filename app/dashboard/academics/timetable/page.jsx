import TimeTableClient from '@/components/academics/TimeTableClient';
import { getClassSectionsMap } from '@/lib/classes';
import { getActiveSession } from '@/lib/academicSessions';
import { ACADEMIC_SESSIONS } from '@/lib/students';

export const metadata = {
  title: 'Time Table | SchoolApp 360',
};

export default async function TimeTablePage() {
  const [classSections, activeSession] = await Promise.all([getClassSectionsMap(), getActiveSession()]);

  return <TimeTableClient classSections={classSections} academicSession={activeSession?.name || ACADEMIC_SESSIONS[0]} />;
}
