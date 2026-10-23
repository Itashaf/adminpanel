// Mirrors ExamDetailsClient.jsx's real layout (header card with title+badge,
// 3 meta pills, action buttons; a 6-step checklist row; the schedule grid
// section) — same bespoke-skeleton convention as app/dashboard/classes/
// loading.jsx, replacing the generic PageLoader spinner this page used
// before.
export default function ExamDetailsLoading() {
  return (
    <div className="flex flex-col h-full gap-6 animate-pulse">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-56 bg-gray-100 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="h-6 w-40 bg-gray-50 rounded-full" />
              <div className="h-6 w-32 bg-gray-50 rounded-full" />
              <div className="h-6 w-28 bg-gray-50 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-100 rounded-lg" />
            ))}
            <div className="h-10 w-10 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 min-w-[132px]">
              <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-2.5 w-14 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
