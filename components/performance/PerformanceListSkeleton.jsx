// Shared shimmer loader for the 3 Students Report dashboards (Monthly,
// Yearly, Subject Tests) — same stat-cards + StudentsTable-style card
// shape each of them actually renders once data arrives, so the shimmer
// doesn't jump/reflow when the real content swaps in. `statCount` matches
// however many stat cards that screen has (3 or 4).
export default function PerformanceListSkeleton({ statCount = 3, rows = 6 }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className={`grid grid-cols-1 sm:grid-cols-3 ${statCount === 4 ? 'lg:grid-cols-4' : ''} gap-4`}>
        {Array.from({ length: statCount }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 bg-gray-100">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded mt-3" />
            <div className="h-2 w-20 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-3 w-full max-w-md bg-gray-100 rounded" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 bg-gray-100 rounded" />
              <div className="h-2.5 w-24 bg-gray-50 rounded" />
            </div>
            <div className="h-3.5 w-16 bg-gray-100 rounded hidden sm:block" />
            <div className="h-6 w-20 bg-gray-100 rounded-full hidden sm:block" />
            <div className="h-3.5 w-14 bg-gray-100 rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
