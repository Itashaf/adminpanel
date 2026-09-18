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
export async function resolveSchoolId() {
  try {
    const session = await getSession();
    if (session?.schoolId) return session.schoolId;
  } catch {
    // No request context to read cookies/headers from (e.g. a script) —
    // fall through to the singleton below.
  }
  return getActiveSchoolId();
}
