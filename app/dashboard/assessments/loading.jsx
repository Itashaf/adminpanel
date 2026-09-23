// Mirrors AssessmentDashboard.jsx's real layout (header + 4 stat cards +
// progress bar + recently-assessed strip + filter toolbar + roster table) —
// same bespoke shimmer-skeleton convention as app/dashboard/students/loading.jsx,
// used instead of PageLoader's spinner icon.
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-gray-100" />
      <div className="h-3.5 w-24 bg-gray-100 rounded mt-3" />
      <div className="h-7 w-10 bg-gray-100 rounded mt-2" />
    </div>
  );
}

function RecentChipSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 shrink-0 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-gray-100 shrink-0" />
      <div className="space-y-1.5">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-2.5 w-20 bg-gray-50 rounded" />
      </div>
    </div>
  );
}

function RosterRowSkeleton() {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-3 pl-6 pr-3"><div className="h-3 w-4 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-50 rounded" />
          </div>
        </div>
      </td>
      <td className="py-3 pr-4"><div className="h-3 w-10 bg-gray-100 rounded mx-auto animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="w-5 h-5 rounded-full bg-gray-100 mx-auto animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="w-5 h-5 rounded-full bg-gray-100 mx-auto animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="w-5 h-5 rounded-full bg-gray-100 mx-auto animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="py-3 pr-6"><div className="h-7 w-16 bg-gray-100 rounded-full ml-auto animate-pulse" /></td>
    </tr>
  );
}

export default function AssessmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3.5 w-28 bg-gray-100 rounded" />
          <div className="h-3.5 w-8 bg-gray-100 rounded" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="h-3 w-32 bg-gray-100 rounded mb-3 animate-pulse" />
        <div className="flex items-center gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <RecentChipSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3 animate-pulse">
        <div className="h-10 flex-1 min-w-[220px] bg-gray-100 rounded-full" />
        <div className="h-10 w-36 bg-gray-100 rounded-lg" />
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
        <div className="h-10 w-28 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <RosterRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
