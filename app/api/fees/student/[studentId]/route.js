import { NextResponse } from 'next/server';
import { getStudentFees } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { studentId } = await params;

  // Requires SOME real signed-in actor — the old `actor?.role === 'Parent'
  // && ...` check was skipped entirely when `actor` was null (no session at
  // all), letting an unauthenticated caller read any student's fees by
  // guessing/enumerating a studentId. A Parent session additionally must
  // never be able to read another family's fees just by changing the URL.
  // See lib/iam.js's requireParent.
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (actor.role === 'Parent' && actor.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fees = await getStudentFees(studentId, searchParams.get('session') || '');
  return NextResponse.json(fees);
}
