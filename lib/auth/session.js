import { cookies, headers } from 'next/headers';
import { signSessionToken, verifySessionToken } from './jwt';

// One cookie shared by every real-credentialed login (Super Admin, School
// Admin) — the payload's `role` tells routes/pages who's actually signed in.
// This is a separate concept from lib/currentUser.js's SchoolAdmin/Teacher
// dashboard-role toggle, which decides which *view* of /dashboard renders
// and isn't itself an authentication check.
const SESSION_COOKIE = 'edumanage_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches the JWT's own expiry

export async function createSession(payload) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE)?.value;

  // No browser cookie jar to fall back on for a mobile client — it sends the
  // same JWT (issued by /api/auth/teacher/login or /api/auth/parent/login)
  // as `Authorization: Bearer <token>` instead. Cookie wins when both happen
  // to be present (shouldn't normally occur).
  if (!token) {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length);
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
