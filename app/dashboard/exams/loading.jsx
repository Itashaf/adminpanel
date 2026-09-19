// Mirrors ExamDashboardClient.jsx's real layout (header + 4 stat cards +
// a wide summary panel + a lower panel with a table) — same
// bespoke-skeleton convention as app/dashboard/classes/loading.jsx.
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="w-9 h-9 rounded-lg bg-gray-100" />
      </div>
      <div className="h-6 w-12 bg-gray-100 rounded mt-3" />
    </div>
  );
}

export default function ExamDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-gray-100 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-4">
          <div className="h-4 w-36 bg-gray-100 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
          <div className="h-4 w-28 bg-gray-100 rounded" />
          <div className="h-32 bg-gray-50 rounded-xl" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
