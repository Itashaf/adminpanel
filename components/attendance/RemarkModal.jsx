'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';

export default function RemarkModal({ isOpen, onClose, student, initialRemark, onSave }) {
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRemark(initialRemark || '');
    setError('');
  }, [isOpen, initialRemark]);

  const handleSave = () => {
    if (!remark.trim()) {
      setError('Remark is required.');
      return;
    }
    onSave(remark.trim());
  };

  return (
    <Modal title="Add Remark" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Student</p>
          <p className="text-base font-bold text-gray-900">{student?.name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            placeholder="e.g. Sick, Arrived 20 minutes late, Medical appointment"
            autoFocus
            className={`w-full py-2.5 px-4 border rounded-2xl focus:outline-none focus:ring-2 resize-none ${
              error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
            }`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-1">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth />
          </div>
          <Button label="Save Remark" onClick={handleSave} fullWidth={false} />
        </div>
      </div>
    </Modal>
  );
}
