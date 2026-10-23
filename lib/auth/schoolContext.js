import { AsyncLocalStorage } from 'node:async_hooks';
import { getSession } from './session';
import { getActiveSchoolId } from '../school';

// Resolves which school to scope a query by: a signed-in session's own real
// `schoolId` claim (set at login for Teacher/Parent/SchoolAdmin — see
// app/api/auth/teacher/login, app/api/auth/parent/login, and
// app/actions/auth.js's schoolAdminLoginAction) always wins over the
// single-tenant demo singleton (lib/school.js's getActiveSchoolId()), which
// is only a fallback for SuperAdmin sessions (not scoped to one school) and
// any context with no session at all (a script, say).
//
// Only import this from lib files that are guaranteed never reachable from
// a Client Component (lib/attendance.js, lib/iam.js) — it transitively pulls
// in next/headers via getSession(), which breaks the client bundle the
// moment anything imports it. lib/students.js and lib/teachers.js can't use
// this directly for that reason; they take an explicit `schoolId` parameter
// instead (see their getSchoolStudents/getSchoolTeachers).
// Lets a job that has no session (the cron routes) run a piece of work for one
// specific school: everything resolveSchoolId() is asked for inside `fn` gets
// that school, and nothing outside it is affected (unlike the global singleton).
const schoolOverride = new AsyncLocalStorage();
export function runWithSchool(schoolId, fn) {
  return schoolOverride.run(schoolId, fn);
}

export async function resolveSchoolId() {
  const forced = schoolOverride.getStore();
  if (forced) return forced;

  let session;
  try {
    session = await getSession();
  } catch {
    // No request context to read cookies/headers from (e.g. a script) —
    // the singleton is all there is.
    return getActiveSchoolId();
  }

  if (session?.schoolId) return session.schoolId;
  // A Super Admin session is not scoped to one school; it uses the school it
  // last stepped into ("Manage This School").
  if (session?.role === 'SuperAdmin' || session?.roleKey === 'SuperAdmin') return getActiveSchoolId();

  // A request with no session (or one that carries no school) must never be
  // handed some other school's data. Callers are expected to check sign-in
  // first; this is the backstop.
  throw new Error('Not signed in.');
}
