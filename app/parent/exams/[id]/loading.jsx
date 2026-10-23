// Mirrors components/parent/ParentExamDetailView.jsx: back link, exam title +
// meta line, 3 KPI cards (Total Marks / Percentage / Grade), subject-wise
// marks card, exam schedule card.
function SectionSkeleton({ rows, tile }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gray-100" />
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 last:border-b-0">
          {tile && <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />}
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-gray-100 rounded" />
            {tile && <div className="h-3 w-48 bg-gray-50 rounded" />}
          </div>
          <div className="h-4 w-16 bg-gray-100 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function ParentExamDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded" />

      <div className="space-y-2.5">
        <div className="h-8 w-72 bg-gray-100 rounded" />
        <div className="h-4 w-96 max-w-full bg-gray-100 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[20px] shadow-sm px-6 py-5 bg-gray-200">
            <div className="flex items-start justify-between">
              <div className="h-3.5 w-24 bg-gray-300/70 rounded" />
              <div className="w-11 h-11 rounded-xl bg-gray-300/70" />
            </div>
            <div className="h-9 w-28 bg-gray-300/70 rounded mt-2" />
            <div className="h-3 w-32 bg-gray-300/70 rounded mt-5" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100" />
            <div className="space-y-2">
              <div className="h-4 w-40 bg-gray-100 rounded" />
              <div className="h-3 w-56 bg-gray-50 rounded" />
            </div>
          </div>
          <div className="h-10 w-48 bg-gray-100 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100" />
                <div className="h-3.5 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-7 w-28 bg-gray-100 rounded" />
              <div className="h-2 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      <SectionSkeleton rows={3} tile />
    </div>
  );
}
