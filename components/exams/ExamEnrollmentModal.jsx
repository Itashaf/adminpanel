'use client';

import { useEffect, useState } from 'react';
import { FiUsers } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { getScheduleEnrollments, setScheduleEnrollments } from '@/lib/api';

export default function ExamEnrollmentModal({ isOpen, onClose, schedule, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !schedule) return;
    setIsLoading(true);
    setError('');
    getScheduleEnrollments(schedule.id)
      .then((data) => {
        setStudents(data.students || []);
        setSelectedIds(data.enrolledIds || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, schedule]);

  const allSelected = students.length > 0 && students.every((s) => selectedIds.includes(s.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : students.map((s) => s.id));
  const toggleOne = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await setScheduleEnrollments(schedule.id, selectedIds);
      onSuccess?.(`Enrollment updated — ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'} enrolled for ${schedule.subject}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!schedule) return null;

  return (
    <Modal
      title="Manage Enrollment"
      description={`Choose which students in ${schedule.className}${schedule.sectionName ? ` (Sec ${schedule.sectionName})` : ''} take "${schedule.subject}".`}
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth />
          <Button label={isSaving ? 'Saving...' : 'Save Enrollment'} onClick={handleSave} disabled={isSaving || isLoading} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-10">Loading roster...</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No students found in this class and section.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <FiUsers className="w-3.5 h-3.5" />
              {selectedIds.length} of {students.length} enrolled
            </span>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Select all
            </label>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleOne(s.id)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-gray-900">{s.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{s.admissionId}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
