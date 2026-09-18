'use client';

import { useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import FeeStructureCard from './FeeStructureCard';
import FeeStructureFormModal from './FeeStructureFormModal';
import GenerateFeesModal from './GenerateFeesModal';
import { CLASS_LEVELS, classNameForLevel } from '@/lib/classConstants';

// Playway/Nursery/LKG/UKG, then Class 1-12 — same order as every class
// picker in the app (see lib/classConstants.js's CLASS_LEVELS), not
// creation-time order, so the cards read the same way an admin thinks about
// their school's classes.
const CLASS_ORDER = new Map(CLASS_LEVELS.map((level, index) => [classNameForLevel(level), index]));

export default function FeeStructuresExplorer({ structures, sessionOptions, classOptions, defaultSession = '' }) {
  // Seeded once from the server-rendered list, then updated directly from
  // each mutation's own response — no router.refresh(). See the "Optimistic
  // UI Updates" rule in SKILL.md.
  const [structuresList, setStructuresList] = useState(structures);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [generateTarget, setGenerateTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // `structures` is always an array now — one item for an edit or a
  // single-class create, several for a multi-class create (see the "Create
  // Structure" modal's class picker / "Duplicate" flow).
  const handleFormSuccess = (structures, message) => {
    setStructuresList((prev) => {
      let next = prev;
      for (const structure of structures) {
        const exists = next.some((s) => s.id === structure.id);
        next = exists ? next.map((s) => (s.id === structure.id ? structure : s)) : [structure, ...next];
      }
      return next;
    });
    setShowFormModal(false);
    setEditTarget(null);
    setDuplicateSource(null);
    setToastMessage(message);
  };

  const handleDeleted = (id) => {
    setStructuresList((prev) => prev.filter((s) => s.id !== id));
  };

  const sortedStructures = useMemo(
    () =>
      [...structuresList].sort(
        (a, b) => (CLASS_ORDER.get(a.className) ?? Infinity) - (CLASS_ORDER.get(b.className) ?? Infinity)
      ),
    [structuresList]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Structures</h1>
          <p className="text-sm text-gray-500 mt-1">Define the fee items charged per class, then generate term-wise fees for students.</p>
        </div>
        <Button label="Create Structure" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowFormModal(true)} />
      </div>

      {structuresList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 text-center py-16">No fee structures yet — click "Create Structure" to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sortedStructures.map((structure) => (
            <FeeStructureCard
              key={structure.id}
              structure={structure}
              onEdit={(s) => {
                setEditTarget(s);
                setShowFormModal(true);
              }}
              onDuplicate={(s) => {
                setDuplicateSource(s);
                setShowFormModal(true);
              }}
              onGenerate={setGenerateTarget}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <FeeStructureFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditTarget(null);
          setDuplicateSource(null);
        }}
        structure={editTarget}
        duplicateFrom={duplicateSource}
        sessionOptions={sessionOptions}
        classOptions={classOptions}
        defaultSession={defaultSession}
        onSuccess={handleFormSuccess}
      />

      <GenerateFeesModal
        isOpen={Boolean(generateTarget)}
        onClose={() => setGenerateTarget(null)}
        structure={generateTarget}
        onSuccess={(message) => {
          setGenerateTarget(null);
          setToastMessage(message);
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
