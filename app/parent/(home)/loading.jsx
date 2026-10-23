// Mirrors the Parent dashboard (components/parent/ParentDashboardView.jsx):
// greeting + child card, 4 KPI cards, 3 list cards.
// Lives in the (home) route group so only /parent gets this skeleton — the
// other parent pages keep app/parent/loading.jsx's spinner. Keep the card
// counts/shapes in sync with the view so nothing reflows when content swaps in.
function KPISkeleton() {
  return (
    <div className="rounded-[20px] shadow-sm px-6 py-5 bg-gray-200 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-3.5 w-28 bg-gray-300/70 rounded" />
        <div className="w-11 h-11 rounded-xl bg-gray-300/70" />
      </div>
      <div className="h-9 w-24 bg-gray-300/70 rounded mt-2" />
      <div className="h-3 w-36 bg-gray-300/70 rounded mt-5" />
    </div>
  );
}

function ListCardSkeleton({ rows = 3 }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-14 bg-gray-100 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-2/3 bg-gray-100 rounded" />
              <div className="h-3 w-1/2 bg-gray-50 rounded" />
            </div>
            <div className="h-3 w-16 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParentHomeLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-80 max-w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-[66px] w-72 bg-white border border-gray-100 shadow-sm rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPISkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1.1fr_0.85fr] gap-4">
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </div>
  );
}
