// Generic fallback shimmer for any /parent route without its own loading.jsx
// (title block + one content card) — every current parent page has its own.
export default function ParentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-100 rounded" />
        <div className="h-3.5 w-64 bg-gray-100 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-3.5 w-1/3 bg-gray-100 rounded" />
            <div className="h-3.5 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
