import Pagination from './Pagination';

// Pins the shared Pagination to the viewport's bottom edge instead of
// scrolling away with a long table — same bar `components/exams/
// ExamsExplorer.jsx` already used; pulled out here so every list page
// reuses one definition instead of each re-typing the fixed/offset classes.
// `lg:left-64` matches Sidebar.jsx's own fixed width, so the bar never
// overlaps it on desktop. No `alwaysShow` — Pagination's own default
// already hides itself for a single page, and this bar shouldn't render
// at all (an empty fixed strip reserving space) when there's nothing to
// page through.
export default function FixedPaginationBar({ totalPages, ...props }) {
  if (totalPages <= 1) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-gray-50 border-t border-gray-100 px-4 sm:px-6 py-3 print:hidden">
      <Pagination totalPages={totalPages} {...props} />
    </div>
  );
}
