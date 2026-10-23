// Mirrors components/parent/ParentExamHomeView.jsx: title + subtitle, the two
// KPI cards (Total Exams / Next Exam / Latest Result), then the "All Exams" list. Lives in
// the (list) route group so exams/[id] doesn't inherit this skeleton.
export default function ParentExamsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-56 bg-gray-100 rounded" />
        <div className="h-4 w-52 bg-gray-100 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[20px] shadow-sm px-6 py-5 bg-gray-200">
            <div className="flex items-start justify-between">
              <div className="h-3.5 w-24 bg-gray-300/70 rounded" />
              <div className="w-11 h-11 rounded-xl bg-gray-300/70" />
            </div>
            <div className="h-7 w-44 bg-gray-300/70 rounded mt-3" />
            <div className="h-3 w-40 bg-gray-300/70 rounded mt-5" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 bg-gray-100 rounded" />
              <div className="h-3 w-64 bg-gray-50 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
