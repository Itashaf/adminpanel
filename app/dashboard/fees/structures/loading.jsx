// Mirrors FeeStructuresExplorer.jsx's real layout (header + card grid of
// FeeStructureCard) — same bespoke-skeleton convention as
// app/dashboard/classes/loading.jsx.
function StructureCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-50 rounded" />
          </div>
        </div>
        <div className="w-4 h-4 bg-gray-100 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-gray-50 rounded-lg" />
        <div className="h-8 bg-gray-50 rounded-lg" />
      </div>
      <div className="h-9 bg-gray-100 rounded-lg" />
    </div>
  );
}

export default function FeeStructuresLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-gray-100 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StructureCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
