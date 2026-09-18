import Link from 'next/link';
import { FiArrowRight, FiDollarSign, FiClock } from 'react-icons/fi';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Owner-facing card — down to the three numbers that actually drive a
// decision (collect more, chase pending, escalate overdue), with Overdue
// made the visually dominant figure since it's the one that needs action
// first. The thin bar is the only chart: collected's real share of
// totalFees. `overdue` is already a subset of `pending` (see lib/fees.js's
// getFeesStats — overdue is pending money whose term has also ended), so
// the bar's denominator is totalFees, never collected+pending+overdue.
export default function FeeOverviewCard({ totalFees, collected, pending, overdue = 0 }) {
  const collectedPercent = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Fee Overview</h3>
        <Link href="/dashboard/fees/students" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          View Details
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-red-600">Overdue</p>
          <p className="text-4xl font-bold text-red-600 mt-1 tabular-nums tracking-tight leading-tight">{formatCurrency(overdue)}</p>
        </div>
        <span className="text-xs font-medium text-gray-400 mt-1">{collectedPercent}% collected</span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden my-5">
        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${collectedPercent}%` }} />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-500">Collected</p>
          <div className="flex items-center gap-1.5 mt-1">
            <FiDollarSign className="w-4 h-4 text-green-600" />
            <p className="text-xl font-bold text-green-700 tabular-nums leading-tight">{formatCurrency(collected)}</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-500">Pending</p>
          <div className="flex items-center gap-1.5 mt-1">
            <FiClock className="w-4 h-4 text-blue-600" />
            <p className="text-xl font-bold text-blue-700 tabular-nums leading-tight">{formatCurrency(pending)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
