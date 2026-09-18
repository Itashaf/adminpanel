'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import { TERM_DISPLAY_NAMES } from '@/lib/feeConstants';
import { getPaymentLedger } from '@/lib/api';

const STATUS_VARIANTS = { SUCCESS: 'green', PENDING: 'amber', FAILED: 'red' };

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Every payment ever recorded for one student — a flat transaction history,
// not scoped to one term the way the fee cards are.
export default function PaymentLedgerModal({ isOpen, onClose, studentId, studentName }) {
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !studentId) return;
    let cancelled = false;
    setLedger(null);
    setError('');
    getPaymentLedger(studentId)
      .then((data) => {
        if (!cancelled) setLedger(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, studentId]);

  return (
    <Modal title="Payment Ledger" description={studentName} isOpen={isOpen} onClose={onClose} size="xl">
      {error && <p className="text-sm text-red-500 text-center py-6">{error}</p>}

      {!error && !ledger && <p className="text-sm text-gray-400 text-center py-10">Loading...</p>}

      {!error && ledger && ledger.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No payments recorded yet.</p>
      )}

      {!error && ledger && ledger.length > 0 && (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="py-3 pl-6 pr-4">Date</th>
                <th className="py-3 pr-4">Term</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Discount</th>
                <th className="py-3 pr-4">Method</th>
                <th className="py-3 pr-4">Transaction ID</th>
                <th className="py-3 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3 pl-6 pr-4 text-gray-700">{payment.paidAt || payment.createdAt}</td>
                  <td className="py-3 pr-4 text-gray-700">{TERM_DISPLAY_NAMES[payment.term] || payment.term}</td>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                  <td className="py-3 pr-4">
                    {payment.discountAmount > 0 ? (
                      <span className="text-indigo-600 font-medium">
                        -{formatCurrency(payment.discountAmount)}
                        {payment.discountReason && <span className="block text-xs text-gray-400 font-normal">{payment.discountReason}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{payment.method}</td>
                  <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{payment.razorpayPaymentId || '—'}</td>
                  <td className="py-3 pr-6">
                    <Badge label={payment.status} variant={STATUS_VARIANTS[payment.status] || 'gray'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
