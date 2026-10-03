'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Keeps a list page's filters/sort/page in the URL so it's shareable,
// survives a refresh, and "Back" from a detail page returns to the same
// state instead of resetting to an unfiltered page 1 — same convention
// ExamsExplorer.jsx established first. `values` is the current
// {key: value} snapshot (read `useSearchParams().get(key)` for each one's
// initial useState value); `defaults` is the value that means "this key is
// at its default, omit it from the querystring" (e.g. '' for a filter, 1
// for page, 'latest' for a default sort). Debounced so typing in a search
// box doesn't fire a URL replace (and matching RSC round-trip) on every
// keystroke.
export function useUrlSync(values, defaults, { delay = 300 } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef(null);
  const valuesKey = JSON.stringify(values);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      Object.entries(values).forEach(([key, value]) => {
        if (value && value !== defaults[key]) params.set(key, String(value));
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, delay);
    return () => clearTimeout(timer.current);
    // `values`/`defaults` are re-created every render (plain object
    // literals at each call site) — keying off their serialized form
    // avoids re-running this effect when nothing in them actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, pathname, router]);
}
