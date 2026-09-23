// Mirrors AssessmentDashboard.jsx's real layout (header + 4 stat cards +
// tabs/search row + roster table) — same bespoke shimmer-skeleton
// convention as app/dashboard/students/loading.jsx, used instead of
// PageLoader's spinner icon.
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
      <div className="space-y-2">
        <div className="h-6 w-10 bg-gray-100 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
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
          <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
          <div className="h-3.5 w-32 bg-gray-100 rounded" />
        </div>
      </td>
      <td className="py-3 pr-4"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="h-3 w-10 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="py-3 pr-6"><div className="h-7 w-28 bg-gray-100 rounded-lg ml-auto animate-pulse" /></td>
    </tr>
  );
}

export default function AssessmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-pulse">
        <div className="flex gap-3">
          <div className="w-1 self-stretch rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-7 w-64 bg-gray-100 rounded" />
            <div className="h-4 w-80 bg-gray-100 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-100 rounded-xl" />
          <div className="h-10 w-28 bg-gray-100 rounded-xl" />
          <div className="h-10 w-36 bg-gray-100 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3 animate-pulse">
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-100 rounded-lg" />
          <div className="h-9 w-28 bg-gray-100 rounded-lg" />
          <div className="h-9 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-10 w-64 bg-gray-100 rounded-full" />
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
