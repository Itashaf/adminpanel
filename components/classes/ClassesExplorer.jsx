'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClassesHeader from './ClassesHeader';
import ClassesGrid from './ClassesGrid';
import ClassFormModal from './ClassFormModal';
import Toast from '@/components/Toast';

export default function ClassesExplorer({ classes, selectedSession }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  return (
    <div className="space-y-6">
      <ClassesHeader onAddClass={() => setShowAddModal(true)} />
      <ClassesGrid classes={classes} onAddClass={() => setShowAddModal(true)} />

      <ClassFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        cls={null}
        defaultSession={selectedSession}
        onSuccess={(message) => {
          setShowAddModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
