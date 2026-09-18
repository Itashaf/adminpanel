'use client';

import { useState } from 'react';
import { FiX, FiLayers } from 'react-icons/fi';
import Modal from '@/components/Modal';
import { removeTeacherAssignment } from '@/lib/api';

// The quick row-menu's "Unassign Class" counterpart to "Assign Class" — one
// assignment removes directly with no picker needed; more than one (rare,
// but a teacher can have several) lists them so the admin picks which. Same
// removeTeacherAssignment call the full profile page's Assignments tab uses.
export default function UnassignClassModal({ isOpen, onClose, teacherId, assignments, onSuccess }) {
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');

  const handleRemove = async (assignmentId) => {
    setRemovingId(assignmentId);
    setError('');
    try {
      await removeTeacherAssignment(teacherId, assignmentId);
      onSuccess?.('Assignment removed.');
    } catch (err) {
      setError(err.message);
      setRemovingId(null);
    }
  };

  return (
    <Modal title="Unassign Class" description="Remove one of this teacher's class assignments." isOpen={isOpen} onClose={onClose}>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>
      )}

      <div className="space-y-3">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 shrink-0">
                <FiLayers className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {assignment.class}
                  {assignment.section ? ` - Section ${assignment.section}` : ''}
                </p>
                <p className="text-xs text-gray-400">{assignment.academicSession}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(assignment.id)}
              disabled={removingId === assignment.id}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <FiX className="w-4 h-4" />
              {removingId === assignment.id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
