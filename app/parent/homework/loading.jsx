// Mirrors components/parent/ParentHomeworkView.jsx: title + subtitle, search/
// filter row, then the table card (row list on mobile) with its pagination footer.
export default function ParentHomeworkLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-44 bg-gray-100 rounded" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-[42px] bg-white border border-gray-100 rounded-full" />
        <div className="w-full sm:w-52 h-[42px] bg-white border border-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <div className="h-12 bg-gray-50" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[50px_1fr_2fr_90px_110px_120px] gap-5 items-center px-6 py-4 border-t border-gray-100">
              <div className="h-3.5 w-5 bg-gray-100 rounded" />
              <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
              <div className="h-3 w-5/6 bg-gray-50 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
              <div className="h-3.5 w-20 bg-gray-100 rounded" />
              <div className="h-3.5 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0">
              <div className="mt-2 w-2.5 h-2.5 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-40 bg-gray-100 rounded" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                </div>
                <div className="h-3 w-2/3 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-gray-50 border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="h-4 w-44 bg-gray-100 rounded" />
        <div className="h-9 w-40 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
