'use client';

import { useState } from 'react';
import { FiBell } from 'react-icons/fi';
import Toast from '@/components/Toast';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Real overdue-only rows (see lib/fees.js's getPendingFeesList with
// onlyOverdue) — a student merely unpaid but not yet past their due date
// never shows up here, so "Defaulter" stays accurate. The CTA calls
// /api/fees/send-reminder for every listed student in one go — a real
// in-app Notice (Individual/Parent) per linked parent, due amount
// recomputed server-side, not trusted from this list.
export default function FeeDefaultersCard({ rows }) {
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleSendReminders() {
    setSending(true);
    try {
      const res = await fetch('/api/fees/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: rows.map((r) => r.studentId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminders');
      setToast(`Reminder sent to ${data.sent.length} parent${data.sent.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setToast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Fee Defaulters</h3>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={handleSendReminders}
            disabled={sending}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <FiBell className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Send Reminder'}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No fee defaulters right now.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={row.studentId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                <p className="text-xs text-gray-400">{row.class}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-red-600">{formatCurrency(row.dueAmount)}</p>
                <p className="text-xs text-gray-400">{row.daysOverdue}d overdue</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
