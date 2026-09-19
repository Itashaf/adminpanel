// Mirrors ExamsExplorer.jsx's real layout (header + a grid-header row +
// ExamCard rows) — same bespoke-skeleton convention as
// app/dashboard/classes/loading.jsx.
function ExamRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 sm:px-6 py-4 border-t border-gray-100 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-40 bg-gray-100 rounded" />
        <div className="h-3 w-24 bg-gray-50 rounded" />
      </div>
      <div className="h-5 w-16 bg-gray-100 rounded-full shrink-0" />
      <div className="h-4 w-4 bg-gray-100 rounded shrink-0" />
    </div>
  );
}

export default function ExamsListLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
        <div className="h-7 w-40 bg-gray-100 rounded" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
        <div className="flex flex-wrap gap-3">
          <div className="h-10 flex-1 min-w-[200px] bg-gray-100 rounded-full" />
          <div className="h-10 w-32 bg-gray-100 rounded-full" />
          <div className="h-10 w-32 bg-gray-100 rounded-full" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <ExamRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
