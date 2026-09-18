function HomeworkCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
        <div className="h-6 w-28 bg-gray-100 rounded-full" />
      </div>
      <div className="h-5 w-2/3 bg-gray-100 rounded" />
      <div className="h-4 w-full bg-gray-50 rounded" />
      <div className="h-3 w-48 bg-gray-50 rounded" />
    </div>
  );
}

export default function HomeworkLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <HomeworkCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
