import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Real overdue-only rows (see lib/fees.js's getPendingFeesList with
// onlyOverdue) — a student merely unpaid but not yet past their due date
// never shows up here, so "Defaulter" stays accurate.
export default function FeeDefaultersCard({ rows }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Fee Defaulters</h3>
        <Link href="/dashboard/fees/students?status=DUE" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          View All
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
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
