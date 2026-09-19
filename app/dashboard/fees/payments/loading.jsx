// Mirrors PaymentsExplorer.jsx's real layout (filter bar + table, no stat
// cards) — same bespoke-skeleton convention as app/dashboard/classes/loading.jsx.
function TableRowSkeleton() {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-4 pl-6 pr-4">
        <div className="space-y-1.5 animate-pulse">
          <div className="h-3.5 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-20 bg-gray-50 rounded" />
        </div>
      </td>
      <td className="py-4 pr-4"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-4 pr-4"><div className="h-3 w-20 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-4 pr-4"><div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="py-4 pr-6"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
    </tr>
  );
}

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-7 w-44 bg-gray-100 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
        <div className="flex flex-wrap gap-3">
          <div className="h-10 flex-1 min-w-[200px] bg-gray-100 rounded-full" />
          <div className="h-10 w-36 bg-gray-100 rounded-full" />
          <div className="h-10 w-32 bg-gray-100 rounded-full" />
          <div className="h-10 w-32 bg-gray-100 rounded-full" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
