// `date.toISOString().slice(0, 10)` looks like an obvious way to get a
// 'YYYY-MM-DD' string, but `toISOString()` always converts to UTC first — on
// a server running ahead of UTC (e.g. Asia/Calcutta, UTC+5:30) a local
// midnight `Date` rolls back to the *previous* UTC calendar day, silently
// shifting every date this generates back by one. Use this instead
// everywhere a calendar date needs to come from a `Date` object; it reads
// the local year/month/day directly.
export function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
