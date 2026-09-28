import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { Avatar } from '@/components/settings/RolesPermissionsExplorer';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// The Accountant dashboard's "who to chase" table — each row is one
// student's single most urgent unpaid term (see lib/fees.js's
// getPendingFeesList), sorted most-overdue first. `daysOverdue` is real,
// derived from the term's own quarter-end date, not an invented number —
// same definition getFeesStats already uses for the Overdue figure.
export default function PendingFeesCard({ rows }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pending Fees</h3>
        <Link href="/dashboard/fees/students?status=DUE" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          View All
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No pending fees — everyone's paid up.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-3">Student Name</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Due Amount</th>
                <th className="py-2 pr-3">Due Date</th>
                <th className="py-2">Days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.studentId} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} seed={i} />
                      <span className="font-medium text-gray-900 truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-gray-600">{r.class}</td>
                  <td className="py-3 pr-3 font-semibold text-gray-900">{formatCurrency(r.dueAmount)}</td>
                  <td className="py-3 pr-3 text-gray-500">{formatDate(r.dueDate)}</td>
                  <td className="py-3">
                    {r.daysOverdue != null && r.daysOverdue > 0 ? (
                      <span className="inline-block text-xs font-semibold rounded-full px-2.5 py-1 bg-red-50 text-red-600">
                        {r.daysOverdue}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not due</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
