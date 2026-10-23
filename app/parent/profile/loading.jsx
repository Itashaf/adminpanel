// Mirrors components/parent/ParentProfileView.jsx: title + subtitle, the
// identity card with its 9-tile grid, Father/Mother cards, Address card and
// Emergency Contacts card.
function TilesSkeleton({ count, columns }) {
  return (
    <div className={`grid grid-cols-2 ${columns} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-gray-50 px-4 py-3 space-y-2">
          <div className="h-3 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function GroupSkeleton({ count, columns }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
      </div>
      <TilesSkeleton count={count} columns={columns} />
    </div>
  );
}

export default function ParentProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2.5">
        <div className="h-8 w-44 bg-gray-100 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-100 shrink-0" />
          <div className="space-y-2 flex-1 flex flex-col items-center sm:items-start">
            <div className="h-5 w-44 bg-gray-100 rounded" />
            <div className="h-3.5 w-24 bg-gray-100 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-32 bg-gray-100 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-gray-100">
          <TilesSkeleton count={9} columns="sm:grid-cols-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GroupSkeleton count={4} columns="sm:grid-cols-2" />
        <GroupSkeleton count={4} columns="sm:grid-cols-2" />
      </div>
      <GroupSkeleton count={4} columns="sm:grid-cols-4" />
      <GroupSkeleton count={4} columns="sm:grid-cols-4" />
    </div>
  );
}
