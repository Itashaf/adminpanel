import SessionsExplorer from '@/components/sessions/SessionsExplorer';
import { getAllSessions } from '@/lib/academicSessions';

export const metadata = {
  title: 'Academic Sessions | SchoolApp 360',
};

export default async function SessionsPage() {
  const sessions = await getAllSessions();

  return <SessionsExplorer sessions={sessions} />;
}
