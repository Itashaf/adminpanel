// Mirrors app/dashboard/page.jsx's actual layout (SchoolPulseCard hero,
// 2 stat cards, QuickActions' 4 cards, Attendance+Fee overview) — same
// bespoke-skeleton convention as app/dashboard/classes/loading.jsx,
// homework/loading.jsx, etc., rather than the generic PageLoader spinner
// (see components/PageLoader.jsx for when that's the better fit instead).
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="w-9 h-9 rounded-lg bg-gray-100" />
      </div>
      <div className="h-7 w-16 bg-gray-100 rounded mt-3" />
      <div className="h-3 w-24 bg-gray-50 rounded mt-2" />
    </div>
  );
}

function QuickActionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse space-y-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div className="h-4 w-3/4 bg-gray-100 rounded" />
      <div className="h-3 w-1/2 bg-gray-50 rounded" />
    </div>
  );
}

function OverviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="w-9 h-9 rounded-lg bg-gray-100" />
      </div>
      <div className="h-24 bg-gray-50 rounded-xl" />
      <div className="flex gap-4">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* SchoolPulseCard hero */}
      <div className="relative overflow-hidden rounded-[24px] p-6 shadow-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED]">
        <div className="relative flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6 animate-pulse">
          <div className="min-w-0 flex-1">
            <div className="h-7 w-56 bg-white/20 rounded" />
            <div className="h-4 w-72 bg-white/10 rounded mt-3" />
            <div className="flex flex-wrap gap-3 mt-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-1 min-w-[150px] bg-white/10 border border-white/15 rounded-2xl px-4 py-3 h-24" />
              ))}
            </div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 lg:w-52 shrink-0 h-32" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <QuickActionSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverviewCardSkeleton />
        <OverviewCardSkeleton />
      </div>

      <div className="h-20 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
    </div>
  );
}
