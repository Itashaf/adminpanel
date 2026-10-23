import prisma from '../db';

// A session token is a signed claim that lasts 7 days; without a check, an account
// deactivated today keeps working until it expires. This asks the database whether
// the account (and its school) is still allowed in, remembering the answer for a
// short time so it costs one small query per account every TTL, not one per request.
// A deactivation therefore takes effect within TTL_MS on any server instance.
const TTL_MS = 20 * 1000;
const cache = globalThis.__SESSION_STATUS_CACHE__ ?? (globalThis.__SESSION_STATUS_CACHE__ = new Map());

async function schoolIsActive(schoolId) {
  if (!schoolId) return true;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { status: true } });
  return Boolean(school) && school.status === 'Active';
}

async function check(payload) {
  const { role, id, schoolId } = payload;
  if (!id) return true;

  if (role === 'SuperAdmin') {
    return Boolean(await prisma.superAdmin.findUnique({ where: { id }, select: { id: true } }));
  }

  if (role === 'SchoolAdmin') {
    // A legacy admin row, or (Principal / Accountant) a plain User row whose id
    // is the session id.
    const admin = await prisma.schoolAdmin.findUnique({ where: { id }, select: { status: true, schoolId: true } });
    if (admin) return admin.status === 'Active' && (await schoolIsActive(admin.schoolId));
    const user = await prisma.user.findUnique({ where: { id }, select: { status: true, schoolId: true } });
    if (user) return user.status === 'Active' && (await schoolIsActive(user.schoolId));
    return false;
  }

  if (role === 'Teacher') {
    const t = await prisma.teacher.findUnique({
      where: { id },
      select: { status: true, loginEnabled: true, loginAccountStatus: true, schoolId: true },
    });
    if (!t) return false;
    return t.status === 'Active' && t.loginEnabled && t.loginAccountStatus === 'Active' && (await schoolIsActive(t.schoolId));
  }

  if (role === 'Parent') {
    const p = await prisma.parentAccount.findUnique({ where: { id }, select: { schoolId: true } });
    if (!p) return false;
    return schoolIsActive(p.schoolId || schoolId);
  }

  return true;
}

// true when the session may keep being used. If the database cannot be reached the
// session is left alone rather than logging everybody out (nothing works then anyway).
export async function isSessionStillValid(payload) {
  const key = `${payload.role}:${payload.id}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.ok;

  let ok;
  try {
    ok = await check(payload);
  } catch (err) {
    console.error('session status check failed', err?.message || err);
    return true;
  }
  cache.set(key, { ok, at: now });
  if (cache.size > 5000) {
    for (const [k, v] of cache) if (now - v.at > TTL_MS) cache.delete(k);
  }
  return ok;
}
