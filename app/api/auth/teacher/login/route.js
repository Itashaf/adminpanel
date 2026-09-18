import { NextResponse } from 'next/server';
import { validateTeacherCredentials } from '@/lib/teachers';
import { signSessionToken } from '@/lib/auth/jwt';

// Token-returning counterpart to app/actions/auth.js's teacherLoginAction —
// that Server Action only flips lib/currentUser.js's in-memory dashboard
// toggle, which works for the single-browser web demo but has nothing a
// mobile client can carry between requests. This route signs a real
// edumanage_session JWT (role: 'Teacher') and returns it in the body so the
// mobile app can store it (expo-secure-store) and send it back as
// `Authorization: Bearer <token>` — lib/auth/session.js's getSession() reads
// that header as a fallback when there's no cookie.
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { teacher, schoolId, error } = await validateTeacherCredentials(email, password);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const token = await signSessionToken({ role: 'Teacher', id: teacher.id, schoolId, email: teacher.loginAccess.email });

  return NextResponse.json({
    token,
    teacher: { id: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`, email: teacher.loginAccess.email },
  });
}
