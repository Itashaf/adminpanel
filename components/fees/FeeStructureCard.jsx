'use client';

import { useState } from 'react';
import { FiMoreVertical, FiEdit2, FiCopy, FiTrash2, FiZap, FiBookOpen, FiChevronRight } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { FEE_TERMS } from '@/lib/feeConstants';
import { deleteFeeStructure } from '@/lib/api';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const TERM_SHORT_LABEL = { T1: 'Q1', T2: 'Q2', T3: 'Q3', T4: 'Q4' };
const TERM_SHORT_RANGE = { T1: 'Apr – Jun', T2: 'Jul – Sep', T3: 'Oct – Dec', T4: 'Jan – Mar' };

export default function FeeStructureCard({ structure, onEdit, onDuplicate, onGenerate, onDeleted }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteFeeStructure(structure.id);
      onDeleted?.(structure.id);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => onEdit(structure) },
    { label: 'Duplicate', icon: <FiCopy className="w-4 h-4" />, onClick: () => onDuplicate(structure) },
    { label: 'Generate Fees', icon: <FiZap className="w-4 h-4" />, onClick: () => onGenerate(structure) },
    { label: 'Delete', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  const configuredTerms = FEE_TERMS.filter((term) => structure.terms[term].length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <FiBookOpen className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900">{structure.className}</h3>
            <p className="text-sm text-gray-400">{structure.academicSession}</p>
          </div>
        </div>
        <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
      </div>

      <div className="space-y-3 mb-4">
        {configuredTerms.length === 0 && <p className="text-sm text-gray-400">No fee items configured yet.</p>}
        {configuredTerms.map((term) => (
          <div key={term} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{TERM_SHORT_LABEL[term]}</span>
              <span className="text-gray-400">{TERM_SHORT_RANGE[term]}</span>
            </span>
            <span className="text-gray-900 font-medium">{formatCurrency(structure.termTotals[term])}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-indigo-50/60 px-4 py-3">
        <span className="text-sm font-semibold text-gray-700">Annual Total</span>
        <span className="flex items-center gap-1 text-lg font-bold text-indigo-700">
          {formatCurrency(structure.totalAmount)}
          <FiChevronRight className="w-4 h-4" />
        </span>
      </div>

      <div className="mt-3">
        <Button
          label={structure.isGenerated ? 'Fees Generated' : 'Generate Fees'}
          icon={<FiZap className="w-4 h-4" />}
          variant="primary"
          fullWidth
          disabled={structure.isGenerated}
          onClick={() => onGenerate(structure)}
        />
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
        title="Delete fee structure?"
        description={
          deleteError ||
          `${structure.className} (${structure.academicSession}) will be removed, including every term's fee items. Already-generated student fees are not affected.`
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
