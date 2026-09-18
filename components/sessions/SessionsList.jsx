import SessionCard from './SessionCard';

export default function SessionsList({ sessions, activeSession }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">All Sessions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} activeSession={activeSession} />
        ))}
      </div>
    </div>
  );
}
