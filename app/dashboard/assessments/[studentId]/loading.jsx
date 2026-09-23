// Mirrors AssessmentWizard.jsx's real layout (header + Previous/Next Student
// bar + step tabs + student card + form card) — same bespoke shimmer-
// skeleton convention as the rest of the Assessment module's loading.jsx
// files, used instead of PageLoader's spinner icon.
export default function AssessmentWizardLoading() {
  return (
    <div className="space-y-6 pb-24 animate-pulse">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <div className="h-3.5 w-36 bg-gray-100 rounded" />
          <div className="h-7 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-gray-100 rounded" />
            <div className="h-3 w-36 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-100 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap">
        <div className="w-16 h-16 rounded-full bg-gray-100 shrink-0" />
        <div className="flex-1 min-w-[160px] space-y-2">
          <div className="h-5 w-40 bg-gray-100 rounded" />
          <div className="h-3.5 w-56 bg-gray-100 rounded" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-gray-100 shrink-0" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="h-3.5 w-40 bg-gray-100 rounded" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-gray-100 rounded-full" />
          ))}
        </div>
        <div className="h-3.5 w-32 bg-gray-100 rounded mt-4" />
        <div className="h-24 w-full bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
