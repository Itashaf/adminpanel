'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiCalendar, FiUsers, FiLayers, FiMoreVertical, FiEdit2, FiCheckCircle, FiArchive } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import StatusPill from './StatusPill';
import SessionFormModal from './SessionFormModal';
import SetActiveDialog from './SetActiveDialog';
import { archiveAcademicSession } from '@/lib/api';
import { formatSessionDate } from './dateUtils';

export default function SessionCard({ session, activeSession }) {
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/dashboard/sessions/${session.id}`} className="text-xl font-bold text-gray-900 hover:text-indigo-700">
            {session.name}
          </Link>
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1.5">
            <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
            {formatSessionDate(session.startDate)} — {formatSessionDate(session.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={session.status} />
          {menuItems.length > 0 && <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-600">
          <FiUsers className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">{session.studentCount}</span> Students
        </span>
        <span className="w-px h-4 bg-gray-200" />
        <span className="flex items-center gap-1.5 text-sm text-gray-600">
          <FiLayers className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">{session.classCount}</span> Classes
        </span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/sessions/${session.id}`}
          className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
        >
          View
        </Link>
        {session.status !== 'Archived' && (
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            Edit
          </button>
        )}
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
