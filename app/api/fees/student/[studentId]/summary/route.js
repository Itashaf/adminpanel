import { NextResponse } from 'next/server';
import { getStudentFeeSummary } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { studentId } = await params;

  // Same Parent-ownership guard as the sibling /api/fees/student/[studentId]
  // route. Requires SOME real signed-in actor first — the old
  // `actor?.role === 'Parent' && ...` check was skipped entirely when
  // `actor` was null (no session at all), letting an unauthenticated caller
  // read any student's fee summary by guessing/enumerating a studentId.
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (actor.role === 'Parent' && actor.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const summary = await getStudentFeeSummary(studentId, searchParams.get('session') || '');
  return NextResponse.json(summary);
}
