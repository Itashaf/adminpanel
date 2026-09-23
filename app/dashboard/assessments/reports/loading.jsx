// Mirrors AssessmentReportsView.jsx's real layout (header + filter toolbar +
// 5 stat cards + 3 distribution charts + per-student table) — same bespoke
// shimmer-skeleton convention as app/dashboard/assessments/loading.jsx,
// used instead of PageLoader's spinner icon.
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-gray-100" />
      <div className="h-3.5 w-20 bg-gray-100 rounded mt-3" />
      <div className="h-7 w-10 bg-gray-100 rounded mt-2" />
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="h-3.5 w-32 bg-gray-100 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 h-3 bg-gray-100 rounded shrink-0" />
            <div className="flex-1 h-3 bg-gray-100 rounded-full" />
            <div className="w-6 h-3 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2.5 pl-6 pr-4"><div className="h-3 w-4 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-2.5 pr-4"><div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-2.5 pr-4"><div className="h-3 w-20 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-2.5 pr-4"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-2.5 pr-4"><div className="h-3 w-24 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-2.5 pr-6"><div className="h-3 w-10 bg-gray-100 rounded animate-pulse" /></td>
    </tr>
  );
}

export default function AssessmentReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-gray-100 rounded" />
          <div className="h-7 w-56 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-gray-100 rounded-lg" />
          <div className="h-10 w-28 bg-gray-100 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 animate-pulse">
        <div className="h-10 w-36 bg-gray-100 rounded-lg" />
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ChartCardSkeleton key={i} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
