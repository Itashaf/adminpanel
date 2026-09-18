'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { FEE_TERMS, TERM_LABELS, TERM_DISPLAY_NAMES } from '@/lib/feeConstants';
import { generateStudentFees } from '@/lib/api';

// A structure now covers the whole academic year, with each term's own item
// list (see FeeStructureFormModal.jsx) — so generating still needs to know
// *which* term to create StudentFee records for. Only terms that actually
// have at least one item configured are offered here.
export default function GenerateFeesModal({ isOpen, onClose, structure, onSuccess }) {
  const [term, setTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState('');

  const configuredTerms = structure ? FEE_TERMS.filter((t) => structure.terms[t].length > 0) : [];

  useEffect(() => {
    if (!isOpen) return;
    setTerm(configuredTerms[0] || '');
    setFormError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, structure]);

  const handleGenerate = async () => {
    if (!term) return;
    setIsGenerating(true);
    setFormError('');
    try {
      const result = await generateStudentFees(structure.id, term);
      const parts = [];
      if (result.generatedCount > 0) parts.push(`generated for ${result.generatedCount} new student(s)`);
      if (result.updatedCount > 0) parts.push(`updated for ${result.updatedCount} student(s) who hadn't paid yet`);
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} already paid, left untouched`);

      const message =
        result.totalEligible === 0
          ? `No Active students found in ${structure.className} for ${structure.academicSession}.`
          : parts.length > 0
          ? `${TERM_DISPLAY_NAMES[term]} fees ${parts.join(', ')}.`
          : `${TERM_DISPLAY_NAMES[term]} fees are already up to date for all ${result.totalEligible} student(s).`;
      onSuccess?.(message);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      title="Generate Term Fees"
      description={structure ? `${structure.className} — ${structure.academicSession}` : ''}
      isOpen={isOpen}
      onClose={onClose}
    >
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      {configuredTerms.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          This structure has no fee items configured for any term yet — edit it to add some first.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Pick which term to generate. Creates a fee record for every Active student in this class + session using
            that term's current items — and updates anyone who already has one but hasn't paid yet. A student who's
            already paid is never touched.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {configuredTerms.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTerm(t)}
                className={`rounded-xl px-3 py-3 text-center border transition cursor-pointer ${
                  term === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-semibold">{TERM_DISPLAY_NAMES[t]}</p>
                <p className="text-xs mt-0.5 opacity-70">{TERM_LABELS[t]}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <div className="w-full sm:w-auto">
          <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth disabled={isGenerating} />
        </div>
        <Button
          label={isGenerating ? 'Generating...' : 'Generate Fees'}
          onClick={handleGenerate}
          disabled={isGenerating || !term}
          fullWidth={false}
        />
      </div>
    </Modal>
  );
}
