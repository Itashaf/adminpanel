export default function SessionDetailsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-100 rounded" />
            <div className="h-4 w-64 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-24 bg-gray-100 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 shadow-sm" />
        ))}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm" />
      <div className="h-48 bg-white rounded-2xl border border-gray-100 shadow-sm" />
    </div>
  );
}
