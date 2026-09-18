import { NextResponse } from 'next/server';
import { getStudentFees } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { studentId } = await params;

  // Every other role here follows this app's existing (documented, lax)
  // convention of no per-route auth check — but a Parent session must never
  // be able to read another family's fees just by changing the URL, since
  // this is the one route that's actually reachable by someone outside the
  // single-admin-persona demo. See lib/iam.js's requireParent.
  const actor = await getCurrentUserInfo();
  if (actor?.role === 'Parent' && actor.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fees = await getStudentFees(studentId, searchParams.get('session') || '');
  return NextResponse.json(fees);
}
