function ClassCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-gray-50 rounded-lg" />
        <div className="h-8 bg-gray-50 rounded-lg" />
        <div className="h-8 bg-gray-50 rounded-lg" />
      </div>
      <div className="h-9 bg-gray-100 rounded-lg" />
    </div>
  );
}

export default function ClassesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-gray-100 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-16 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ClassCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
