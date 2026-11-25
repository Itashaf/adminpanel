export default function EmailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-11 w-64 bg-gray-100 rounded-xl" />
      <div className="h-28 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-gray-100 rounded-2xl" />
    </div>
  );
}
