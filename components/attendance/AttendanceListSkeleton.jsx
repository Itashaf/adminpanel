export default function AttendanceListSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        <div className="h-9 w-36 bg-gray-100 rounded-lg" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
          <div className="h-4 flex-1 bg-gray-100 rounded" />
          <div className="h-8 w-64 bg-gray-50 rounded-lg hidden sm:block" />
        </div>
      ))}
    </div>
  );
}
