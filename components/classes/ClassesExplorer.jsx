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
      <ClassesGrid classes={classes} academicSession={selectedSession} onAddClass={() => setShowAddModal(true)} />

      {/* Mounted only while actually open — ClassFormModal calls
          useSubjects() unconditionally on mount (not gated on `isOpen`),
          so rendering it unconditionally here fired a getSubjects()
          request on every visit to this page, before "Add Class" was
          ever clicked. */}
      {showAddModal && (
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
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
