'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClassDetailsHeader from './ClassDetailsHeader';
import ClassStatsCards from './ClassStatsCards';
import ClassInfoCard from './ClassInfoCard';
import SectionsGrid from './SectionsGrid';
import ClassTeacherCard from './ClassTeacherCard';
import ClassFormModal from './ClassFormModal';
import SectionFormModal from './SectionFormModal';
import SubjectsModal from './SubjectsModal';
import Toast from '@/components/Toast';

export default function ClassDetailsClient({ cls, teacherOptions }) {
  const router = useRouter();
  // A class with zero real (named) sections — e.g. Nursery/Playway — never
  // shows the "Sections" grid (or its "Add Section" flow); ClassTeacherCard
  // replaces it with the one thing it still needs: a class teacher. A section
  // with an empty name is the hidden placeholder row used purely to hold a
  // classTeacherId (see assignClassTeacher in lib/classes.js) and doesn't count.
  const hasSections = cls.sections.some((s) => s.name);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSuccess = (message) => {
    setShowEditModal(false);
    setShowAddSectionModal(false);
    setShowSubjectsModal(false);
    setToastMessage(message);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <ClassDetailsHeader
        cls={cls}
        onEditClass={() => setShowEditModal(true)}
        onAddSection={() => setShowAddSectionModal(true)}
      />

      <ClassStatsCards cls={cls} />
      <ClassInfoCard cls={cls} onAddSubject={() => setShowSubjectsModal(true)} />

      {hasSections ? (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Sections</h2>
            <p className="text-sm text-gray-500 mt-1">Manage class sections, teachers, and capacity.</p>
          </div>
          <SectionsGrid
            classId={cls.id}
            className={cls.name}
            academicSession={cls.academicSession}
            sections={cls.sections}
            teacherOptions={teacherOptions}
            onAddSection={() => setShowAddSectionModal(true)}
          />
        </div>
      ) : (
        <ClassTeacherCard
          classId={cls.id}
          className={cls.name}
          section={cls.sections[0] || null}
          teacherOptions={teacherOptions}
        />
      )}

      <ClassFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        cls={cls}
        onSuccess={handleSuccess}
      />

      <SectionFormModal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        classId={cls.id}
        className={cls.name}
        academicSession={cls.academicSession}
        section={null}
        teacherOptions={teacherOptions}
        onSuccess={handleSuccess}
      />

      <SubjectsModal
        isOpen={showSubjectsModal}
        onClose={() => setShowSubjectsModal(false)}
        cls={cls}
        onSuccess={handleSuccess}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
