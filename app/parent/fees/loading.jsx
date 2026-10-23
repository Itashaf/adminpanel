// Mirrors components/parent/ParentFeesView.jsx: title + subtitle with the
// academic-year pill, then the 4 gradient-header term cards in 2 columns.
export default function ParentFeesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2.5">
          <div className="h-8 w-64 bg-gray-100 rounded" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-12 w-52 bg-white border border-gray-100 shadow-sm rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 shadow-sm rounded-[24px] overflow-hidden">
            <div className="h-[68px] bg-gray-200" />
            <div className="p-5 space-y-2.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              ))}
              <div className="flex items-center justify-between pt-3">
                <div className="h-4 w-12 bg-gray-100 rounded" />
                <div className="h-6 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-10 bg-gray-50 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
