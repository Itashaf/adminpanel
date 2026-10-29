// One reusable full-page loading state, shown as a shimmer skeleton (heading, stat cards, a list
// card) instead of a spinner. Used as the `loading.jsx` fallback for routes that don't have a
// bespoke skeleton (see app/dashboard/classes, homework, notices, sessions, leave for the
// custom-skeleton alternative; use that pattern when a page's layout is stable enough to be worth
// mimicking exactly). Also reusable inline wherever a client component needs the same look for a
// client-side fetch — pass `fullScreen={false}` and position it with a wrapping container.
// `label` is accepted for older callers and is not shown.
export default function PageLoader({ fullScreen = true }) {
  const skeleton = (
    <div className="space-y-6 w-full animate-pulse">
      <div className="h-8 w-56 bg-gray-100 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-gray-100 rounded" />
              <div className="h-2.5 w-1/5 bg-gray-50 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  return fullScreen ? <div className="fixed inset-0 z-50 overflow-hidden bg-white/90 p-6 backdrop-blur-sm">{skeleton}</div> : skeleton;
}
