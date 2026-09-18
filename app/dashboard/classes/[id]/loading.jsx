function SectionCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-8 bg-gray-200 rounded" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded flex-1" />
        <div className="h-8 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  );
}

export default function ClassDetailsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-40 bg-gray-100 rounded" />
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-gray-100 rounded" />
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-gray-100 rounded-lg" />
            <div className="h-10 w-32 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 shadow-sm" />
        ))}
      </div>

      <div className="h-32 bg-white rounded-xl border border-gray-100 shadow-sm" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SectionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
