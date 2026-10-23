import SessionsExplorer from '@/components/sessions/SessionsExplorer';
import { getAllSessions } from '@/lib/academicSessions';
import { blockIfAccountant } from '@/lib/roleGuard';

export const metadata = {
  title: 'Academic Sessions | SchoolApp 360',
};

export default async function SessionsPage() {
  await blockIfAccountant();
  const sessions = await getAllSessions();

  return <SessionsExplorer sessions={sessions} />;
}
