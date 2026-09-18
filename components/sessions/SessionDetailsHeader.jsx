'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiEdit2, FiMoreVertical, FiCheckCircle, FiArchive } from 'react-icons/fi';
import Button from '@/components/Button';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import StatusPill from './StatusPill';
import SessionFormModal from './SessionFormModal';
import SetActiveDialog from './SetActiveDialog';
import { archiveAcademicSession } from '@/lib/api';
import { formatSessionDate } from './dateUtils';

export default function SessionDetailsHeader({ session, activeSession }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveAcademicSession(session.id);
      setShowArchiveConfirm(false);
      setToastMessage(`${session.name} has been archived.`);
      router.refresh();
    } finally {
      setIsArchiving(false);
    }
  };

  const menuItems = [];
  if (session.status === 'Upcoming') {
    menuItems.push({
      label: 'Set as Active',
      icon: <FiCheckCircle className="w-4 h-4" />,
      onClick: () => setShowActivateDialog(true),
    });
    menuItems.push({
      label: 'Archive',
      icon: <FiArchive className="w-4 h-4" />,
      onClick: () => setShowArchiveConfirm(true),
      danger: true,
    });
  }

  return (
    <div className="space-y-3">
      <Link
        href="/dashboard/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Academic Sessions
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
            <StatusPill status={session.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {formatSessionDate(session.startDate)} — {formatSessionDate(session.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {session.status !== 'Archived' && (
            <Button
              label="Edit"
              variant="secondary"
              icon={<FiEdit2 className="w-4 h-4" />}
              onClick={() => setShowEditModal(true)}
            />
          )}
          {menuItems.length > 0 && <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={menuItems} />}
        </div>
      </div>

      <SessionFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        session={session}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <SetActiveDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        session={session}
        currentActiveSession={activeSession}
        onSuccess={(message) => {
          setShowActivateDialog(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive session?"
        description={`${session.name} will be moved to archived sessions.`}
        confirmLabel="Archive"
        isLoading={isArchiving}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
