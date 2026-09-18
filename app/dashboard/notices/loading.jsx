function NoticeRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 last:border-0">
      <div className="w-2 h-2 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-1/3 bg-gray-100 rounded" />
        <div className="h-3 w-2/3 bg-gray-50 rounded" />
      </div>
      <div className="h-6 w-20 bg-gray-100 rounded-full shrink-0" />
      <div className="h-3 w-16 bg-gray-50 rounded shrink-0" />
    </div>
  );
}

export default function NoticesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-100 rounded-lg" />
      </div>

      <div className="h-32 bg-white rounded-xl border border-gray-100 shadow-sm" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <NoticeRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
