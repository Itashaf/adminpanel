// Mirrors components/parent/ParentNoticesView.jsx: title + subtitle, then the
// "All Notices" card.
export default function ParentNoticesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-40 bg-gray-100 rounded" />
        <div className="h-4 w-80 max-w-full bg-gray-100 rounded" />
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0">
            <div className="mt-2 w-2.5 h-2.5 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-52 bg-gray-100 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
              <div className="h-3 w-3/4 bg-gray-50 rounded" />
            </div>
            <div className="h-3 w-20 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
