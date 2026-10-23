// Table-row shimmer — mirrors SubjectsExplorer.jsx's actual table layout
// (# | Subject Name | Code | Type | Actions), same bespoke-skeleton
// convention as app/dashboard/classes/loading.jsx — replaces the old
// generic PageLoader spinner shared across all of academics/*.
function SubjectRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
      <div className="h-3.5 flex-1 max-w-[180px] bg-gray-100 rounded" />
      <div className="h-3.5 w-16 bg-gray-50 rounded hidden sm:block" />
      <div className="h-5 w-20 bg-gray-100 rounded-full hidden sm:block" />
      <div className="flex gap-1 ml-auto">
        <div className="w-8 h-8 rounded-lg bg-gray-50" />
        <div className="w-8 h-8 rounded-lg bg-gray-50" />
      </div>
    </div>
  );
}

export default function SubjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-100 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="h-3 w-full max-w-md bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <SubjectRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
