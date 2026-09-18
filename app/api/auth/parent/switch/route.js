import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { signSessionToken } from '@/lib/auth/jwt';
import { verifyParentOwnsStudent } from '@/lib/parentAccounts';

// Mobile counterpart to app/actions/auth.js's switchActiveChildAction — a
// mobile client has no cookie to silently re-issue, so it gets a fresh token
// back to store instead (same Bearer-token pattern as /api/auth/parent/login).
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'Parent') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { studentId } = await request.json();
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
  }

  const owns = await verifyParentOwnsStudent(session.id, studentId);
  if (!owns) {
    return NextResponse.json({ error: 'Not your child.' }, { status: 403 });
  }

  const { iat, exp, ...rest } = session;
  const token = await signSessionToken({ ...rest, activeStudentId: studentId });
  return NextResponse.json({ token, activeStudentId: studentId });
}
