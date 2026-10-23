'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import { TERM_DISPLAY_NAMES } from '@/lib/feeConstants';
import { getPaymentLedger, reversePayment } from '@/lib/api';

const STATUS_VARIANTS = { SUCCESS: 'green', PENDING: 'amber', FAILED: 'red', REVERSED: 'gray' };

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Every payment ever recorded for one student — a flat transaction history,
// not scoped to one term the way the fee cards are.
export default function PaymentLedgerModal({ isOpen, onClose, studentId, studentName, onReversed }) {
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  // The payment whose "Reverse" was clicked, with the reason being typed.
  const [reversing, setReversing] = useState(null);
  const [reason, setReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [reverseError, setReverseError] = useState('');

  const handleReverse = async () => {
    setIsReversing(true);
    setReverseError('');
    try {
      await reversePayment(reversing.id, reason);
      setReversing(null);
      setReason('');
      setReloadKey((k) => k + 1);
      onReversed?.();
    } catch (err) {
      setReverseError(err.message);
    } finally {
      setIsReversing(false);
    }
  };

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
  }, [isOpen, studentId, reloadKey]);

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
                <th className="py-3 pr-4">Receipt</th>
                <th className="py-3 pr-4">Term</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Discount</th>
                <th className="py-3 pr-4">Method</th>
                <th className="py-3 pr-4">Transaction ID</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3 pl-6 pr-4 text-gray-700">{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                  <td className="py-3 pr-4 text-gray-700 font-mono text-xs">
                    {payment.receiptNo || '—'}
                    {payment.collectedByName && <span className="block text-gray-400 font-sans">{payment.collectedByName}</span>}
                  </td>
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
                  <td className="py-3 pr-4">
                    <Badge label={payment.status} variant={STATUS_VARIANTS[payment.status] || 'gray'} />
                    {payment.reversalReason && <span className="block text-xs text-gray-400 mt-1">{payment.reversalReason}</span>}
                  </td>
                  <td className="py-3 pr-6 text-right">
                    {payment.status === 'SUCCESS' && payment.method !== 'RAZORPAY' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReversing(payment);
                          setReason('');
                          setReverseError('');
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reversing && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-gray-700">
            Reverse the {formatCurrency(reversing.amount)} payment{reversing.receiptNo ? ` (${reversing.receiptNo})` : ''}? The amount becomes due again on this fee.
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          {reverseError && <p className="text-sm text-red-600">{reverseError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setReversing(null)} className="px-3 py-1.5 text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReverse}
              disabled={isReversing || reason.trim().length < 3}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white disabled:opacity-50"
            >
              {isReversing ? 'Reversing...' : 'Reverse payment'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
