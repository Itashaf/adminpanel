'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { updateClass } from '@/lib/api';
import { useSubjects } from '@/lib/hooks/useSubjects';

export default function SubjectsModal({ isOpen, onClose, cls, onSuccess }) {
  const [subjects, setSubjects] = useState([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const subjectOptions = useSubjects();

  useEffect(() => {
    if (!isOpen) return;
    setSubjects(cls?.subjects || []);
    setFormError('');
  }, [isOpen, cls]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const toggleSubject = (subject) => {
    setSubjects((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  };

  const handleSubmit = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      await updateClass(cls.id, {
        level: cls.level,
        academicSession: cls.academicSession,
        status: cls.status,
        subjects,
      });
      onSuccess?.('Subjects updated successfully.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit Subjects"
      description={`Add or remove subjects taught in ${cls?.name || 'this class'}.`}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <div className="space-y-4">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {subjectOptions.map((subject) => {
            const isSelected = subjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`text-sm font-medium rounded-full px-3.5 py-1.5 border transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {subject}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="button"
            label={isSubmitting ? 'Saving...' : 'Save Changes'}
            onClick={handleSubmit}
            disabled={isSubmitting}
            fullWidth={false}
          />
        </div>
      </div>
    </Modal>
  );
}
