import { NextResponse } from 'next/server';
import { approveMarks, rejectMarks, unlockMarks } from '@/lib/examMarks';
import { requireSchoolAdmin } from '@/lib/iam';

// POST /api/exams/schedules/[scheduleId]/verify — { action: 'approve' | 'reject' | 'unlock', reason?, studentId? }
// `studentId` narrows the action to just that one student's row instead of
// every mark in this class+section+subject.
export async function POST(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { scheduleId } = await params;
  const { action, reason, studentId } = await request.json();

  try {
    let result;
    if (action === 'approve') {
      result = await approveMarks(scheduleId, actor, studentId || null);
    } else if (action === 'reject') {
      result = await rejectMarks(scheduleId, reason, actor, studentId || null);
    } else if (action === 'unlock') {
      result = await unlockMarks(scheduleId, actor, studentId || null);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
