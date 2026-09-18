import { NextResponse } from 'next/server';
import { getStudentAttendanceStats, getStudentAttendanceSessionStats } from '@/lib/attendance';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || undefined;
  // ?scope=session totals across the student's whole academic session
  // instead of one month (see getStudentAttendanceSessionStats) — the
  // Parent Portal's "how many days present/absent this whole session"
  // question, which the month view alone can't answer.
  const scope = searchParams.get('scope');

  // A Parent must never be able to read another family's child's attendance
  // just by changing the id in this URL (same invariant requireParent
  // documents for every other /parent-reachable route) — every other role
  // here is unguarded like the rest of this app (see lib/iam.js's own note
  // on that gap), so this only narrows the Parent case.
  const actor = await getCurrentUserInfo();
  if (actor?.role === 'Parent' && actor.studentId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats =
    scope === 'session'
      ? await getStudentAttendanceSessionStats(id)
      : await getStudentAttendanceStats(id, { month });
  if (!stats) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json(stats);
}
