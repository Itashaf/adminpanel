import DonutChart from './DonutChart';

function formatCurrency(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Same Collected/Pending split as FeeOverviewCard, as a donut instead of a
// bar — reuses the generic DonutChart (see AttendanceReports' segment
// pattern) rather than a new chart primitive.
export default function FeeCollectionBreakdownCard({ totalFees, collected, pending }) {
  const collectedPercent = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;
  const pendingPercent = totalFees > 0 ? 100 - collectedPercent : 0;

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Collection Breakdown</h3>
      </div>

      <div className="flex items-center gap-6">
        <DonutChart
          total={totalFees}
          segments={[
            { key: 'collected', value: collected, color: '#10b981' },
            { key: 'pending', value: pending, color: '#8b5cf6' },
          ]}
          centerValue={formatCurrency(totalFees)}
          centerLabel="Total Fees"
        />

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              Collected
            </span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(collected)}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{collectedPercent}%</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
              Pending
            </span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(pending)}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{pendingPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
