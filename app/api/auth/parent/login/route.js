import { NextResponse } from 'next/server';
import { validateParentCredentials } from '@/lib/parentAccounts';
import { signSessionToken } from '@/lib/auth/jwt';

// Token-returning counterpart to app/actions/auth.js's parentLoginAction —
// same payload shape as the cookie that action sets (role: 'Parent',
// activeStudentId), just handed back in the response body instead of a
// Set-Cookie header, since a mobile client has no cookie jar to rely on.
// Also returns every linked child (not just the active one) so the mobile
// app can render its own child-switcher without a separate round-trip —
// see /api/auth/parent/switch for how it then gets a new token after
// switching.
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { parentAccount, schoolId, students, error } = await validateParentCredentials(email, password);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (!students.length) {
    return NextResponse.json({ error: 'This account has no linked students.' }, { status: 401 });
  }

  const activeStudentId = students[0].id;
  const token = await signSessionToken({ role: 'Parent', id: parentAccount.id, schoolId, activeStudentId, email: parentAccount.email });

  return NextResponse.json({
    token,
    activeStudentId,
    students: students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      class: s.class,
      section: s.section,
      admissionId: s.admissionId,
      academicSession: s.academicSession,
      photoUrl: s.photoUrl,
    })),
  });
}
