// Table-row skeleton — mirrors ClassesGrid.jsx's actual list/table layout,
// same bespoke-skeleton convention as PerformanceListSkeleton.jsx.
function ClassRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 bg-gray-100 rounded" />
        <div className="h-2.5 w-20 bg-gray-50 rounded" />
      </div>
      <div className="h-6 w-24 bg-gray-100 rounded-lg hidden sm:block" />
      <div className="h-3.5 w-10 bg-gray-100 rounded hidden sm:block" />
      <div className="h-6 w-20 bg-gray-100 rounded-full hidden md:block" />
    </div>
  );
}

export default function ClassesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-gray-100 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-16 bg-white rounded-xl border border-gray-100 shadow-sm" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-3 w-full max-w-md bg-gray-100 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <ClassRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
