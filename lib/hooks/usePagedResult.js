'use client';

import { useEffect, useState } from 'react';

// Holds ONE server page of a filtered list for a client explorer (web
// Homework/Notices). The first page arrives pre-fetched from the server page
// (`initialResult`), so nothing is fetched on mount; after that, whenever the
// filter/page `key` changes, `fetchPage()` loads the new page.
// - `isLoading` is derived (loaded.key !== key), never set synchronously in an
//   effect.
// - After a mutation the explorer calls router.refresh(), which re-renders the
//   server page with a fresh `initialResult`; it's adopted here only if it was
//   computed for the SAME key (`initialKey`) — a slower, older render for a
//   previous filter must never overwrite a newer one.
// - If the current page ends up past the last page (e.g. the last row of the
//   last page was deleted), `setPage` steps back to the real last page.
export function usePagedResult({ initialResult, initialKey, key, page, pageSize, setPage, fetchPage }) {
  const [loaded, setLoaded] = useState(() => ({ key, result: initialResult }));
  const [seenInitial, setSeenInitial] = useState(initialResult);
  const [error, setError] = useState('');

  if (seenInitial !== initialResult) {
    setSeenInitial(initialResult);
    if (initialKey === key) setLoaded({ key, result: initialResult });
  }

  if (loaded.key === key && loaded.result.rows.length === 0 && loaded.result.total > 0 && page > 1) {
    setPage(Math.max(Math.ceil(loaded.result.total / pageSize), 1));
  }

  useEffect(() => {
    if (loaded.key === key) return;
    let cancelled = false;
    fetchPage()
      .then((result) => {
        if (cancelled) return;
        setError('');
        setLoaded({ key, result });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // `key` fully describes the request; `fetchPage` is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { result: loaded.result, isLoading: loaded.key !== key, error };
}
