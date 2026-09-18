function SessionCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-40" />
        </div>
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-10 bg-gray-50 rounded-xl" />
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-gray-100 rounded-lg" />
        <div className="h-9 flex-1 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export default function SessionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-gray-100 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-44 bg-white rounded-2xl border border-gray-100 shadow-sm" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
