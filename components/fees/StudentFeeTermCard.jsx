'use client';

import { useState } from 'react';
import { FiCheckCircle, FiClock } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import RazorpayPayButton from './RazorpayPayButton';
import { TERM_LABELS, TERM_DISPLAY_NAMES } from '@/lib/feeConstants';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_BADGE = {
  PAID: { label: 'PAID', variant: 'green' },
  PARTIAL: { label: 'PARTIAL', variant: 'violet' },
  PENDING: { label: 'DUE', variant: 'amber' },
};

// Renders one term's fee — used identically on the Student Profile "Fees"
// tab and the admin Student Fees page, so a fee always looks the same
// wherever it's shown. `fee` is null when a term hasn't been generated
// yet for this student (structure exists but generateStudentFees hasn't run
// for this term) — shown as a distinct "not generated" state, not PENDING
// with a ₹0 total, since those are different things.
export default function StudentFeeTermCard({
  term,
  fee,
  studentName,
  contact,
  email,
  canCollect = false,
  canPayOnline = canCollect,
  onCollect,
  onPaid,
}) {
  const isPaid = fee?.status === 'PAID';
  const isPartial = fee?.status === 'PARTIAL';
  const remainingDue = fee ? fee.payableAmount - fee.paidAmount : 0;
  const [payError, setPayError] = useState('');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{TERM_DISPLAY_NAMES[term]}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{TERM_LABELS[term]}</p>
        </div>
        {fee && <Badge {...STATUS_BADGE[fee.status]} />}
      </div>

      {!fee ? (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">Not generated yet.</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {fee.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.name}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            {fee.discountAmount > 0 ? (
              <span className="text-right">
                <span className="block text-xs text-gray-400 line-through">{formatCurrency(fee.totalAmount)}</span>
                <span className="text-lg font-bold text-indigo-600">{formatCurrency(fee.payableAmount)}</span>
              </span>
            ) : (
              <span className="text-lg font-bold text-gray-900">{formatCurrency(fee.totalAmount)}</span>
            )}
          </div>

          {isPartial && (
            <div className="flex items-center justify-between text-xs mt-1.5 text-gray-500">
              <span>Paid {formatCurrency(fee.paidAmount)}</span>
              <span className="text-violet-600 font-medium">Due {formatCurrency(remainingDue)}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs mt-2 text-gray-400">
            {isPaid ? (
              <>
                <FiCheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600 font-medium">Paid in full</span>
              </>
            ) : (
              <>
                <FiClock className="w-3.5 h-3.5" />
                <span>{isPartial ? 'Partially paid' : 'Awaiting payment'}</span>
              </>
            )}
          </div>

          {!isPaid && (canCollect || canPayOnline) && (
            <div className="mt-4 space-y-2">
              {canCollect && (
                <Button label={`Collect ${formatCurrency(remainingDue)}`} onClick={() => onCollect?.(fee)} fullWidth />
              )}
              {canPayOnline && (
                <RazorpayPayButton
                  fee={fee}
                  studentName={studentName}
                  contact={contact}
                  email={email}
                  onSuccess={(updatedFee, message) => {
                    setPayError('');
                    onPaid?.(updatedFee, message);
                  }}
                  onError={setPayError}
                />
              )}
              {payError && <p className="text-xs text-red-500 text-center">{payError}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
