import { headers } from 'next/headers';

// Per-request memo for the auth lookups (session, RBAC user, current user
// info) that one route otherwise repeats several times: every guard and every
// lib helper's resolveSchoolId() re-derives the same answer. Keyed on the
// request's own headers object, which Next hands back unchanged for the whole
// request (and drops with it), so nothing leaks into another request. Outside
// a request (scripts, cron with runWithSchool) there are no headers and `fn`
// just runs every time, as before.
const memos = new WeakMap();

export async function memoPerRequest(key, fn) {
  let requestHeaders;
  try {
    requestHeaders = await headers();
  } catch {
    return fn();
  }
  let memo = memos.get(requestHeaders);
  if (!memo) memos.set(requestHeaders, (memo = new Map()));
  if (!memo.has(key)) {
    memo.set(
      key,
      fn().catch((err) => {
        memo.delete(key);
        throw err;
      })
    );
  }
  return memo.get(key);
}

// Called when the session itself changes mid-request (login, switching child,
// logout) so later lookups in the same request see the new one.
export async function clearRequestMemo() {
  try {
    memos.delete(await headers());
  } catch {
    // no request, nothing memoized
  }
}
