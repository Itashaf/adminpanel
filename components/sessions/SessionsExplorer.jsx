'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SessionsHeader from './SessionsHeader';
import CurrentSessionCard from './CurrentSessionCard';
import SessionsList from './SessionsList';
import SessionsEmptyState from './SessionsEmptyState';
import SessionFormModal from './SessionFormModal';
import Toast from '@/components/Toast';

export default function SessionsExplorer({ sessions }) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const activeSession = sessions.find((session) => session.status === 'Active') || null;

  const handleSuccess = (message) => {
    setShowCreateModal(false);
    setToastMessage(message);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <SessionsHeader onCreateSession={() => setShowCreateModal(true)} />

      {sessions.length === 0 ? (
        <SessionsEmptyState onCreateSession={() => setShowCreateModal(true)} />
      ) : (
        <>
          <CurrentSessionCard session={activeSession} />
          <SessionsList sessions={sessions} activeSession={activeSession} />
        </>
      )}

      <SessionFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        session={null}
        onSuccess={handleSuccess}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
