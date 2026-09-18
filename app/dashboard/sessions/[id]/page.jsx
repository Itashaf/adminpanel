import { notFound } from 'next/navigation';
import SessionDetailsHeader from '@/components/sessions/SessionDetailsHeader';
import SessionStatsCards from '@/components/sessions/SessionStatsCards';
import SessionOverviewCard from '@/components/sessions/SessionOverviewCard';
import SessionClassStructure from '@/components/sessions/SessionClassStructure';
import { getSessionById, getActiveSession } from '@/lib/academicSessions';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const session = await getSessionById(id);
  return { title: session ? `${session.name} | SchoolApp 360` : 'Academic Session | SchoolApp 360' };
}

export default async function SessionDetailsPage({ params }) {
  const { id } = await params;
  const [session, activeSession] = await Promise.all([getSessionById(id), getActiveSession()]);

  if (!session) notFound();

  return (
    <div className="space-y-6">
      <SessionDetailsHeader session={session} activeSession={activeSession} />
      <SessionStatsCards session={session} />
      <SessionOverviewCard session={session} />
      <SessionClassStructure classes={session.classes} />
    </div>
  );
}
