export default function SectionDetailsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-7 w-64 bg-gray-100 rounded" />
      </div>

      <div className="h-40 bg-white rounded-xl border border-gray-100 shadow-sm" />
      <div className="h-64 bg-white rounded-xl border border-gray-100 shadow-sm" />
    </div>
  );
}
