import { NextResponse } from 'next/server';
import { validateUserCredentials, touchLastLogin, getUserFieldsForLegacyId } from '@/lib/rbac';
import { validateAdminCredentials } from '@/lib/admins';
import { signSessionToken } from '@/lib/auth/jwt';
import { checkLoginRateLimit } from '@/lib/auth/loginRateLimit';
import { readJson } from '@/lib/http';

// Token-returning counterpart to app/actions/auth.js's schoolAdminLoginAction
// — same lookup order (legacy SchoolAdmin table first for Admin, then a
// pure-User Principal/Accountant via validateUserCredentials) and same
// session shapes, just signed into a bearer token instead of a cookie so the
// mobile app can carry it. `role: 'SchoolAdmin'` for all three is the coarse
// legacy tag lib/iam.js's getCurrentUserInfo expects; real capability comes
// from roleKey/permissions (lib/rbac.js getCurrentRBACUser via userId).
export async function POST(request) {
  const { email, password } = await readJson(request);
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const rateLimit = await checkLoginRateLimit(request.headers, email);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { admin, error: adminError } = await validateAdminCredentials(email, password);
  if (!adminError) {
    const rbacFields = await getUserFieldsForLegacyId('schoolAdmin', admin.id);
    const token = await signSessionToken({ role: 'SchoolAdmin', id: admin.id, schoolId: admin.schoolId, email: admin.email, ...rbacFields });
    return NextResponse.json({
      token,
      user: { id: admin.id, name: admin.name, email: admin.email, roleKey: rbacFields?.roleKey || 'Admin' },
    });
  }

  const { user, error } = await validateUserCredentials(email, password);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }
  await touchLastLogin(user.id);

  const token = await signSessionToken({
    role: 'SchoolAdmin',
    id: user.id,
    schoolId: user.schoolId,
    email: user.email,
    userId: user.id,
    roleId: user.roleId,
    roleKey: user.role.key,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, roleKey: user.role.key },
  });
}
