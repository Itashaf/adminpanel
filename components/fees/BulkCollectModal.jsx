'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { bulkCollectFees } from '@/lib/api';

const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

// Collects the FULL remaining due for every selected student's outstanding
// fees in one go — there's no per-student partial-amount input in a bulk
// flow, so this always pays each selected student's fees off in full. Use
// the row-level Collect action (CollectFeeModal) for a partial payment.
export default function BulkCollectModal({ isOpen, onClose, studentIds, onSuccess }) {
  const [method, setMethod] = useState('CASH');
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState('');

  const handleCollect = async () => {
    setIsCollecting(true);
    setError('');
    try {
      const result = await bulkCollectFees(studentIds, method);
      const message =
        result.collectedCount === 0
          ? 'Selected students have no pending fees to collect.'
          : `Collected fees for ${result.studentCount} student(s) across ${result.collectedCount} fee record(s), totaling ₹${result.totalCollected.toLocaleString('en-IN')}.`;
      onSuccess?.(result, message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <Modal
      title="Collect Payment"
      description={`${studentIds.length} student(s) selected — this collects each one's full remaining due.`}
      isOpen={isOpen}
      onClose={onClose}
    >
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>
      )}

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method <span className="text-red-500">*</span>
        </label>
        <Dropdown options={METHOD_OPTIONS} value={method} onChange={setMethod} placeholder="Select payment method" />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <div className="w-full sm:w-auto">
          <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth disabled={isCollecting} />
        </div>
        <Button
          label={isCollecting ? 'Collecting...' : `Collect for ${studentIds.length} Student(s)`}
          onClick={handleCollect}
          disabled={isCollecting}
          fullWidth={false}
        />
      </div>
    </Modal>
  );
}
