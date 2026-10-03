import { NextResponse } from 'next/server';
import { validateUserCredentials, touchLastLogin } from '@/lib/rbac';
import { signSessionToken } from '@/lib/auth/jwt';
import { checkLoginRateLimit } from '@/lib/auth/loginRateLimit';

// Token-returning counterpart to app/actions/auth.js's schoolAdminLoginAction
// Principal/Accountant fallback branch — same validateUserCredentials lookup
// and same session shape (role: 'SchoolAdmin', id: user.id — see lib/iam.js's
// getCurrentUserInfo SchoolAdmin-branch fallback, which resolves straight off
// the User table when no legacy SchoolAdmin row matches that id), just signed
// into a bearer token instead of a cookie so the mobile app can carry it.
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const rateLimit = checkLoginRateLimit(request.headers, email);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
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
