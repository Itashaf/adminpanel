'use server';

// Every login/logout/role-toggle call used to be a client-side `fetch()` to
// an `/api/auth/*` route, which meant each one showed up in the browser's
// Network tab as a named, readable REST call (payload included). Server
// Actions replace that: the client calls these functions directly (no
// `/api/...` import, no manual `fetch`), and Next.js proxies the call
// through its own internal Action protocol instead of a discoverable named
// endpoint — the network entry that still shows is a generic POST to the
// current route, not `school-admin-login`. See SKILL.md for the fuller
// trade-off writeup (a network request always exists in some form).
//
// Expected failures (bad credentials, missing fields) are returned as
// `{ error }`, never thrown — Next.js redacts a thrown error's message
// down to an opaque digest for any client calling a Server Action from a
// production build, so `throw new Error('Invalid email or password.')`
// would silently stop showing that message the moment this ships. Only
// throw here for a truly unexpected failure (e.g. the DB is unreachable).
import { validateSuperAdminCredentials } from '@/lib/auth';
import { validateAdminCredentials } from '@/lib/admins';
import { validateTeacherCredentials, requestTeacherPasswordReset, setTeacherPasswordViaToken } from '@/lib/teachers';
import { validateParentCredentials, verifyParentOwnsStudent } from '@/lib/parentAccounts';
import { getSchoolDirectoryEntry } from '@/lib/schools';
import { setActiveSchoolContext } from '@/lib/school';
import { redirect } from 'next/navigation';
import { createSession, clearSession, getSession } from '@/lib/auth/session';
import { setCurrentRole } from '@/lib/currentUser';

// Every login action below ends with redirect() (not a client-side
// router.push()) — this is the officially recommended App Router pattern for
// exactly this situation. A client-side push/refresh right after a Server
// Action that just set a cookie can serve a stale entry from Next's Router
// Cache (e.g. an earlier middleware.js redirect-to-/login this same browser
// tab cached before signing in), which either silently no-ops or, worse,
// fires two overlapping fetches for the destination (visible in the Network
// tab as the same route requested 2-3 times). redirect() thrown from inside
// the action sidesteps the client router entirely — no stale cache to hit.
export async function superAdminLoginAction({ email, password }) {
  if (!email || !password) return { error: 'Missing fields' };

  const { superAdmin, error } = await validateSuperAdminCredentials(email, password);
  if (error) return { error };

  await createSession({ role: 'SuperAdmin', id: superAdmin.id, email: superAdmin.email });
  redirect('/super-admin/schools');
}

export async function schoolAdminLoginAction({ email, password }) {
  if (!email || !password) return { error: 'Missing fields' };

  const { admin, error } = await validateAdminCredentials(email, password);
  if (error) return { error };

  // Signing in as a school's admin "steps into" that school for /dashboard —
  // same illusion of tenant-switching the super admin's "Manage This School"
  // action uses (see setActiveSchoolContext), no real per-tenant data
  // isolation behind it yet.
  const school = await getSchoolDirectoryEntry(admin.schoolId);
  if (school) await setActiveSchoolContext(school);

  await createSession({ role: 'SchoolAdmin', id: admin.id, schoolId: admin.schoolId, email: admin.email });
  // Previously a second action the client called separately after this one
  // resolved (setCurrentRoleAction('SchoolAdmin')) — folded in here since
  // this action now redirects instead of returning, so there's no longer a
  // "resolve, then call the next thing" step for the client to chain.
  await setCurrentRole('SchoolAdmin');
  redirect('/dashboard');
}

export async function teacherLoginAction({ email, password }) {
  if (!email || !password) return { error: 'Missing fields' };

  const { teacher, schoolId, error } = await validateTeacherCredentials(email, password);
  if (error) return { error };

  // Real session carrying this teacher's own schoolId — previously this only
  // cleared a stale cookie and relied on lib/school.js's shared ACTIVE_SCHOOL
  // singleton (whatever school a Super Admin last "Manage This School"'d
  // into, or the seed default after a dev-server restart) for anything that
  // resolves the school via resolveSchoolId() (branding, settings, etc.). That
  // meant a teacher's dashboard could show a completely different school's
  // name/logo depending on unrelated browser activity. Creating a real
  // session here — same as SchoolAdmin/Parent login — makes resolveSchoolId()
  // always return *this* teacher's actual school.
  await createSession({ role: 'Teacher', id: teacher.id, schoolId, email: teacher.loginAccess.email });
  // Resolves this specific teacher into the "current user" the rest of the
  // app (Attendance's class/section scoping, reports, etc.) reads from.
  await setCurrentRole('Teacher', teacher.id);
  redirect('/dashboard');
}

export async function parentLoginAction({ email, password }) {
  if (!email || !password) return { error: 'Missing fields' };

  const { parentAccount, schoolId, students, error } = await validateParentCredentials(email, password);
  if (error) return { error };
  if (!students.length) return { error: 'This account has no linked students — contact your school administrator.' };

  // A real per-request identity (unlike Teacher's global toggle) — every
  // /parent page and API call scopes to `activeStudentId`, never something
  // the caller can pass in (see requireParent). Starts on the first linked
  // child; switchActiveChildAction changes it after login.
  await createSession({ role: 'Parent', id: parentAccount.id, schoolId, activeStudentId: students[0].id, email: parentAccount.email });
  redirect('/parent');
}

// Lets a parent with several children linked to one account move between
// them without logging out — see lib/iam.js's Parent branch for how
// `activeStudentId` then drives every /parent page's scoping. Never trusts
// the caller's studentId at face value first (Rule: a parent must never be
// handed another family's data by guessing/tampering with an id).
export async function switchActiveChildAction(studentId) {
  const session = await getSession();
  if (!session || session.role !== 'Parent') return { error: 'Not signed in.' };

  const owns = await verifyParentOwnsStudent(session.id, studentId);
  if (!owns) return { error: 'Not your child.' };

  const { iat, exp, ...rest } = session;
  await createSession({ ...rest, activeStudentId: studentId });
  return { success: true };
}

export async function logoutAction() {
  await clearSession();
  return { success: true };
}

export async function requestPasswordResetAction({ email }) {
  if (!email) return { error: 'Email is required' };
  // Never reveals whether this email actually matches a teacher account —
  // requestTeacherPasswordReset() is itself a no-op for a non-match, so the
  // same "check your email" response is correct either way.
  await requestTeacherPasswordReset(email);
  return { message: 'Password reset link sent', email };
}

export async function setPasswordAction({ token, password }) {
  if (!token || !password) return { error: 'Missing fields' };
  return setTeacherPasswordViaToken(token, password);
}
