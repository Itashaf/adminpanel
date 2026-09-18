'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Always keeps the first/last page and a small window around the current
// page, collapsing everything else into a single '...' — without this a
// roster with enough pages (e.g. 82 students / 5 per page = 17 pages) renders
// every single page number and overflows/wraps the pagination bar.
function getPageItems(page, totalPages, siblingCount = 1) {
  const delta = siblingCount;
  const range = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i);
    }
  }

  const items = [];
  let previous;
  for (const i of range) {
    if (previous !== undefined) {
      if (i - previous === 2) {
        items.push(previous + 1);
      } else if (i - previous !== 1) {
        items.push('...');
      }
    }
    items.push(i);
    previous = i;
  }
  return items;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
  itemLabel = 'results',
  pageSizeOptions,
  onPageSizeChange,
  alwaysShow = false,
}) {
  if (totalCount === 0) return null;
  if (!alwaysShow && totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const pageItems = getPageItems(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{start}</span>–
        <span className="font-medium text-gray-700">{end}</span> of{' '}
        <span className="font-medium text-gray-700">{totalCount}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 cursor-pointer transition"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          {pageItems.map((item, index) =>
            item === '...' ? (
              <span key={`ellipsis-${index}`} className="flex items-center justify-center w-9 h-9 text-sm text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer transition ${
                  item === page
                    ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 cursor-pointer transition"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>

        {pageSizeOptions && onPageSizeChange && (
          <div className="w-32 shrink-0">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} per page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
