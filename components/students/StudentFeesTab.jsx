'use client';

import { useEffect, useState } from 'react';
import { FiCreditCard, FiTag } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Button from '@/components/Button';
import StudentFeeTermCard from '@/components/fees/StudentFeeTermCard';
import CollectFeeModal from '@/components/fees/CollectFeeModal';
import StandingDiscountModal from '@/components/fees/StandingDiscountModal';
import { FEE_TERMS } from '@/lib/feeConstants';
import { getStudentFees, applyStandingDiscountToPendingFees } from '@/lib/api';

function formatDiscount(discountType, discountValue) {
  return discountType === 'PERCENT' ? `${discountValue}%` : `₹${discountValue.toLocaleString('en-IN')}`;
}

export default function StudentFeesTab({ student, canManage = true }) {
  const [fees, setFees] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [collectTarget, setCollectTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showStandingDiscount, setShowStandingDiscount] = useState(false);
  const [isApplyingToPending, setIsApplyingToPending] = useState(false);
  const [standingDiscount, setStandingDiscountState] = useState({
    discountType: student.discountType,
    discountValue: student.discountValue,
    discountReason: student.discountReason,
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getStudentFees(student.id, student.academicSession)
      .then((data) => {
        if (!cancelled) setFees(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id, student.academicSession]);

  const feeByTerm = new Map((fees || []).map((fee) => [fee.term, fee]));
  const totalFee = (fees || []).reduce((sum, fee) => sum + fee.payableAmount, 0);
  const paidFee = (fees || []).reduce((sum, fee) => sum + fee.paidAmount, 0);
  const dueFee = totalFee - paidFee;
  const overallStatus = dueFee <= 0 ? 'Paid' : paidFee > 0 ? 'Partially Paid' : 'Due';

  // Optimistic update from the collection's own response — see the
  // "Optimistic UI Updates" rule in SKILL.md, no refetch needed.
  const handleCollected = (updatedFee, message) => {
    setFees((prev) => (prev || []).map((fee) => (fee.id === updatedFee.id ? { ...fee, ...updatedFee } : fee)));
    setCollectTarget(null);
    setToastMessage(message);
  };

  const handleStandingDiscountSaved = (result, message) => {
    setStandingDiscountState(result);
    setShowStandingDiscount(false);
    setToastMessage(message);
  };

  const handleApplyToPending = async () => {
    setIsApplyingToPending(true);
    try {
      const result = await applyStandingDiscountToPendingFees(student.id);
      setToastMessage(
        result.appliedCount === 0
          ? 'No eligible pending fees to update.'
          : `Applied to ${result.appliedCount} term(s)${result.skippedCount > 0 ? `, skipped ${result.skippedCount} (already paid past the new amount)` : ''}.`
      );
      getStudentFees(student.id, student.academicSession).then(setFees);
    } catch (err) {
      setToastMessage(err.message);
    } finally {
      setIsApplyingToPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiCreditCard className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Fees</h3>
          <p className="text-sm text-gray-500 mt-0.5">Academic Session: {student.academicSession}</p>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 sm:px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
              <FiTag className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Standing Discount</p>
              {standingDiscount.discountType ? (
                <p className="text-xs text-gray-500 truncate">
                  {formatDiscount(standingDiscount.discountType, standingDiscount.discountValue)} off every term
                  {standingDiscount.discountReason ? ` — ${standingDiscount.discountReason}` : ''}
                </p>
              ) : (
                <p className="text-xs text-gray-400">None set — applies automatically to every future term once set.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
            {standingDiscount.discountType && (
              <Button
                label={isApplyingToPending ? 'Applying...' : 'Apply to Pending Fees'}
                variant="secondary"
                onClick={handleApplyToPending}
                disabled={isApplyingToPending}
              />
            )}
            <Button
              label={standingDiscount.discountType ? 'Edit' : 'Set Discount'}
              variant="secondary"
              onClick={() => setShowStandingDiscount(true)}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {FEE_TERMS.map((t) => (
            <div key={t} className="h-52 bg-gray-50 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}

      {!isLoading && !error && fees?.length > 0 && (
        <div className="sm:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-base font-bold text-gray-900">Fee Summary</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">Overview of fee payment status.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Total Fee', value: `₹${totalFee.toLocaleString('en-IN')}`, tile: 'bg-blue-50 text-blue-700' },
              { label: 'Paid', value: `₹${paidFee.toLocaleString('en-IN')}`, tile: 'bg-green-50 text-green-700' },
              { label: 'Due', value: `₹${dueFee.toLocaleString('en-IN')}`, tile: 'bg-rose-50 text-rose-600' },
              { label: 'Status', value: overallStatus, tile: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, tile }) => (
              <div key={label} className={`rounded-xl p-3 ${tile}`}>
                <p className="text-xs opacity-80">{label}</p>
                <p className="text-base font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEE_TERMS.map((term) => (
            <StudentFeeTermCard
              key={term}
              term={term}
              fee={feeByTerm.get(term) || null}
              studentName={`${student.firstName} ${student.lastName}`}
              contact={student.guardian?.phone || student.whatsappNumber}
              email={student.guardian?.email}
              canCollect={canManage}
              onCollect={setCollectTarget}
              onPaid={handleCollected}
            />
          ))}
        </div>
      )}

      <CollectFeeModal
        isOpen={Boolean(collectTarget)}
        onClose={() => setCollectTarget(null)}
        fee={collectTarget}
        studentName={`${student.firstName} ${student.lastName}`}
        onSuccess={handleCollected}
      />

      <StandingDiscountModal
        isOpen={showStandingDiscount}
        onClose={() => setShowStandingDiscount(false)}
        student={{ id: student.id, ...standingDiscount }}
        onSuccess={handleStandingDiscountSaved}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
