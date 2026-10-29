// Mirrors the Leave page: heading with a filter toggle, 4 stat cards, then request cards. Shimmer
// only, same convention as the other bespoke loading.jsx files.
function RequestCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 bg-gray-100 rounded" />
          <div className="h-2.5 w-28 bg-gray-50 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded-full shrink-0" />
      </div>
      <div className="h-3 w-3/4 bg-gray-50 rounded mt-4" />
      <div className="flex gap-2 mt-4">
        <div className="h-8 w-24 bg-gray-100 rounded-full" />
        <div className="h-8 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

export default function LeaveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="h-10 w-60 bg-gray-100 rounded-full" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <RequestCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
