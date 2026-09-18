import { NextResponse } from 'next/server';
import { getStudentFeeSummary } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { studentId } = await params;

  // Same Parent-ownership guard as the sibling /api/fees/student/[studentId]
  // route.
  const actor = await getCurrentUserInfo();
  if (actor?.role === 'Parent' && actor.studentId !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const summary = await getStudentFeeSummary(studentId, searchParams.get('session') || '');
  return NextResponse.json(summary);
}
