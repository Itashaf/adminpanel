'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLogIn, FiUserCheck, FiUserX, FiEdit2 } from 'react-icons/fi';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import StatusPill from './StatusPill';
import EditSchoolModal from './EditSchoolModal';
import { manageSchool, updateSchoolDirectoryStatus } from '@/lib/api';

export default function SchoolDetailsHeader({ school }) {
  const router = useRouter();
  // Seeded once from the server-rendered school, then updated directly on a
  // successful status toggle — StatusPill below is the only thing on this
  // page that shows status, so there's no need for a router.refresh() (which
  // would re-fetch the whole page) just to flip this one field.
  const [status, setStatus] = useState(school.status);
  const isActive = status === 'Active';
  const [isSwitching, setIsSwitching] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleManage = async () => {
    setIsSwitching(true);
    try {
      await manageSchool(school.id);
      router.push('/dashboard');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      const nextStatus = isActive ? 'Inactive' : 'Active';
      await updateSchoolDirectoryStatus(school.id, nextStatus);
      setStatus(nextStatus);
      setShowToggleConfirm(false);
      setToastMessage(isActive ? 'School deactivated.' : 'School activated.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-3">
      <Link
        href="/super-admin/schools"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Schools
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <StatusPill status={status} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button label="Edit School" variant="secondary" icon={<FiEdit2 className="w-4 h-4" />} onClick={() => setShowEditModal(true)} />
          <Button
            label={isActive ? 'Deactivate' : 'Activate'}
            variant="secondary"
            icon={isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />}
            onClick={() => setShowToggleConfirm(true)}
          />
          <Button label="Manage This School" icon={<FiLogIn className="w-4 h-4" />} onClick={handleManage} disabled={isSwitching} />
        </div>
      </div>

      <EditSchoolModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        school={school}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showToggleConfirm}
        onClose={() => setShowToggleConfirm(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Deactivate school?' : 'Activate school?'}
        description={
          isActive ? `${school.name} will be marked inactive on the platform.` : `${school.name} will be marked active again.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
