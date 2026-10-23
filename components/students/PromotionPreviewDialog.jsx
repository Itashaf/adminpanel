'use client';

import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const OUTCOME_VARIANT = {
  Promoted: 'green',
  Repeat: 'amber',
};

// Real per-student preview (Student | Previous Session/Class/Section | New
// Session/Class/Section | Outcome) in place of the old summary-only
// ConfirmDialog text — built straight from `rows` (see
// PromoteStudentsExplorer.jsx's buildPreviewRows), no extra API call. Reuses
// Modal directly (not ConfirmDialog) since a scrollable table needs its own
// `children`/`footer` split, same convention as every other Modal-based
// table/form dialog in this app.
export default function PromotionPreviewDialog({ isOpen, onClose, onConfirm, rows, hasConflict, isLoading }) {
  return (
    <Modal
      title="Review before confirming"
      description={`${rows.length} student${rows.length === 1 ? '' : 's'} will move. Check each row before confirming.`}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex flex-col gap-3">
          {hasConflict && (
            <p className="text-xs text-red-500">
              One or more students already have a different enrollment recorded for the target session — fix the rows
              marked below before confirming.
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || hasConflict}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Please wait...' : 'Confirm'}
            </button>
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-3 pr-4">Student</th>
              <th className="py-3 pr-4">Previous</th>
              <th className="py-3 pr-4">New</th>
              <th className="py-3 pr-2 text-center">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                  {row.name}
                  {row.conflict && <p className="text-xs font-normal text-red-500 mt-0.5">{row.conflict}</p>}
                </td>
                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.previous}</td>
                <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.next}</td>
                <td className="py-3 pr-2 text-center">
                  <Badge label={row.outcome} variant={OUTCOME_VARIANT[row.outcome]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
