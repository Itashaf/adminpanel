// Mirrors PrintMarksheetClient.jsx's real layout (header + a 3-col picker
// row) — same bespoke-skeleton convention as app/dashboard/classes/loading.jsx.
// The printable marksheet table itself only ever appears after a
// client-side class/section/exam selection, never on the initial server
// render, so there's nothing to skeleton for it here.
export default function PrintMarksheetLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-44 bg-gray-100 rounded animate-pulse" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-11 bg-gray-100 rounded-full" />
          <div className="h-11 bg-gray-100 rounded-full" />
          <div className="h-11 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
