// RBAC auth core (Option B, task list items 7-11). Lives alongside
// lib/iam.js, not in place of it — no login flow writes the new session
// shape yet (that's task 12-17), so nothing here is wired into a route.
// Once login is cut over, lib/iam.js's requireSchoolAdmin/requireTeacher/
// requireParent/requireSuperAdmin get replaced by requireRole/
// requirePermission below; getCurrentUserInfo() gets replaced by
// getCurrentRBACUser(). Until then this file is inert, unread code.
import { NextResponse } from 'next/server';
import { getSession, createSession } from './auth/session';
import { verifyPassword } from './auth/password';
import prisma from './db';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
function notSignedIn() {
  return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
}

// Stamps User.lastLoginAt — called from every login path that resolves a
// User row (getUserFieldsForLegacyId below, and the Principal/Accountant
// pure-User login in app/actions/auth.js). Fire-and-forget-shaped (awaited,
// but errors never block a login) — a failed timestamp write is not a
// reason to fail someone's sign-in.
export async function touchLastLogin(userId) {
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  } catch {
    // Non-fatal — see comment above.
  }
}

// Login for Principal/Accountant — the two roles created only through
// POST /api/users (task 21), with no legacy table (SchoolAdmin/Teacher/
// ParentAccount) of their own to authenticate against. Restricted to just
// these two roleKeys so this never becomes a second, ambiguous path for an
// Admin account — those still log in via the legacy SchoolAdmin table
// (validateAdminCredentials), unchanged.
export async function validateUserCredentials(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const row = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' }, role: { key: { in: ['Principal', 'Accountant'] } } },
    include: { role: true },
  });

  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return { error: 'Invalid email or password.' };
  }
  if (row.status !== 'Active') {
    return { error: 'This account has been deactivated. Contact the platform administrator.' };
  }

  return { user: row };
}

// Task 7 — new session payload: { userId, roleId, roleKey, schoolId }.
// Replaces the legacy { role, id, schoolId, email } shape login actions
// write today. Call this from a login action once it's rewritten to look
// the user up in the new User table (task 12-17) — not called anywhere yet.
export async function createUserSession(user) {
  await createSession({ userId: user.id, roleId: user.roleId, roleKey: user.role.key, schoolId: user.schoolId });
}

// Legacy `role` string -> RoleKey. Needed by the fallback branch below —
// task 26 swaps existing requireSchoolAdmin()/etc. calls for
// requirePermission() across routes that ANY currently-valid session (old
// shape or new) can hit; without this bridge, a session signed before the
// login cutover (task 12-15) — or for a legacy row prisma/migrate-rbac.js
// hasn't reached yet — would get a false 401 the instant a route's guard
// changed, which is exactly the "don't break existing auth" this whole
// project keeps being told not to do.
const LEGACY_ROLE_TO_KEY = { SuperAdmin: 'SuperAdmin', SchoolAdmin: 'Admin', Teacher: 'Teacher', Parent: 'Parent' };

// Task 8 — resolves the signed-in actor's permission set, working off
// *either* session shape. `userId` present (every login since task 12-15) ->
// resolve the real User row. Otherwise -> map the legacy `role` string to
// its RoleKey and load that Role's permission set directly — a role's
// permissions are a global definition (RolePermission), not tied to any one
// User row, so this is a correct answer, not a guess, for a legacy-shape
// session. Every actor object carries both `id` (User.id, null in the
// fallback case) and `legacyId` (the old table's own row id, always
// present) — see getUserScope below for why both matter.
export async function getCurrentRBACUser() {
  const session = await getSession();
  if (!session) return null;

  if (session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (user && user.status === 'Active') {
      return {
        id: user.id,
        legacyId: session.id ?? null,
        schoolId: user.schoolId,
        name: user.name,
        email: user.email,
        roleKey: user.role.key,
        permissions: new Set(user.role.permissions.map((rp) => rp.permission.key)),
      };
    }
    // User row missing/inactive but the session still has a legacy role —
    // fall through rather than treat a stale userId as "not signed in".
  }

  const roleKey = LEGACY_ROLE_TO_KEY[session.role];
  if (!roleKey) return null;

  const role = await prisma.role.findUnique({
    where: { key: roleKey },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return null;

  return {
    id: null,
    legacyId: session.id ?? null,
    schoolId: session.schoolId ?? null,
    name: session.email || '',
    email: session.email || '',
    roleKey: role.key,
    permissions: new Set(role.permissions.map((rp) => rp.permission.key)),
  };
}

// Task 9 — the three guard primitives the spec asked for. Usage:
//   const { user, error } = await requirePermission('students.create');
//   if (error) return error;
export async function requireAuth() {
  const user = await getCurrentRBACUser();
  if (!user) return { error: notSignedIn() };
  return { user };
}

export async function requireRole(roleKey) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  if (user.roleKey !== roleKey) return { error: forbidden() };
  return { user };
}

export async function requirePermission(permissionKey) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  if (!user.permissions.has(permissionKey)) return { error: forbidden() };
  return { user };
}

// A handful of routes (e.g. a shared photo/document upload-url endpoint
// used by both a create form and an edit form) are correctly reachable
// under more than one permission — allow if the actor has ANY of them.
export async function requireAnyPermission(permissionKeys) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  if (!permissionKeys.some((k) => user.permissions.has(k))) return { error: forbidden() };
  return { user };
}

// Task 10 — Role = what a user can do (the permission set above). Scope =
// whose data they can touch. Generalizes the classTeacherOf/assignedClasses
// (Teacher) and linked-children (Parent) checks already used ad hoc across
// Attendance/Assessments/Students/Fees (see lib/iam.js's Teacher/Parent
// branches) into one place a permission-checked route can also call.
// Returns `null` for Admin/Principal/Accountant/SuperAdmin — unrestricted,
// whole-school (or whole-platform) scope, nothing further to check.
//
// ponytail: re-derives Teacher/Parent scope with its own queries rather
// than importing lib/iam.js's version, which is keyed off the legacy
// session's own id, not User.id — a real shared helper needs the login
// cutover (task 12-17) done first, so the two call sites use the same id
// space. Small, deliberate duplication until then.
export async function getUserScope(user) {
  // Matches by real User.id (post-login-cutover accounts) OR the legacy
  // table's own id (a legacy-shape session, or a row not yet migrated) —
  // see getCurrentRBACUser's comment on why both need checking.
  const idFilter = { OR: [user.id && { userId: user.id }, user.legacyId && { id: user.legacyId }].filter(Boolean) };

  if (user.roleKey === 'Teacher') {
    const teacher = await prisma.teacher.findFirst({ where: idFilter });
    if (!teacher) return { classes: [] };
    const sections = await prisma.section.findMany({
      where: { schoolId: user.schoolId, classTeacherId: teacher.id },
      include: { class: { select: { name: true, academicSession: true } } },
    });
    return { classes: sections.map((s) => ({ class: s.class.name, section: s.name, academicSession: s.class.academicSession })) };
  }

  if (user.roleKey === 'Parent') {
    const parentAccount = await prisma.parentAccount.findFirst({
      where: idFilter,
      include: { students: { select: { studentId: true } } },
    });
    return { studentIds: parentAccount ? parentAccount.students.map((s) => s.studentId) : [] };
  }

  return null;
}

// Checks a scoped user (Teacher/Parent) against one resource. Admin-tier
// roles (getUserScope returned null) always pass — they have no scope
// restriction to check.
export async function isInScope(user, resource) {
  const scope = await getUserScope(user);
  if (scope === null) return true;
  if (scope.classes && resource.class) {
    return scope.classes.some((c) => c.class === resource.class && (!resource.section || c.section === resource.section));
  }
  if (scope.studentIds && resource.studentId) {
    return scope.studentIds.includes(resource.studentId);
  }
  return false;
}

// Tasks 12-15 — looks up the RBAC User row linked to a legacy account (by
// whichever legacy table + id a login flow already has) so it can merge the
// new session fields (userId/roleId/roleKey) into the *same* session
// payload the old shape already writes — an "expand" migration, not a
// swap: every existing getCurrentUserInfo() branch keeps reading its own
// `role`/`id`/`schoolId` fields exactly as before, unaffected, while
// getCurrentRBACUser() (task 8) also starts working off the same cookie.
// Returns null if this legacy row hasn't been migrated yet (see
// prisma/migrate-rbac.js) — login still succeeds, just without the new
// fields until a re-run of that script catches it up.
export async function getUserFieldsForLegacyId(model, legacyId) {
  const row = await prisma[model].findUnique({ where: { id: legacyId }, select: { userId: true } });
  if (!row?.userId) return null;
  const user = await prisma.user.findUnique({ where: { id: row.userId }, include: { role: true } });
  if (!user) return null;
  await touchLastLogin(user.id);
  return { userId: user.id, roleId: user.roleId, roleKey: user.role.key };
}

// Tasks 18-22 — resolves a RoleKey string to its (seeded, fixed) Role row.
// Every management route below needs this to turn a request body's
// "Teacher"/"Admin"/... string into the roleId a User row actually stores.
export async function getRoleByKey(roleKey) {
  return prisma.role.findUnique({ where: { key: roleKey } });
}

// Task 11 — role assignment hierarchy (server-enforced, never trust a
// frontend-hidden option). Moved to lib/rbacConstants.js (task 23-25) so
// the Roles & Permissions UI can import the same hierarchy without pulling
// this file's server-only imports (next/server, prisma) into the client
// bundle — re-exported here so every existing server call site is
// unaffected.
//
// assertCanAssignRole does NOT check "can't change own role" / "can't
// self-elevate" — those need the actor's own userId vs the target user's
// id, which belongs in the user-update API itself (task 22), not in this
// pure role-pair check.
export { canAssignRole, assertCanAssignRole } from './rbacConstants';
