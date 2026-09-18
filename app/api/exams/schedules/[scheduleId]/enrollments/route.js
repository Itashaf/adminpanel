import { NextResponse } from 'next/server';
import { getEligibleStudentsForSchedule, setEnrollmentsForSchedule } from '@/lib/examOptionalEnrollment';
import { requireSchoolAdmin } from '@/lib/iam';

// GET/PUT /api/exams/schedules/[scheduleId]/enrollments — which students are
// enrolled in one optional/elective ExamSchedule (Class 11/12-style).
export async function GET(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { scheduleId } = await params;
  try {
    const result = await getEligibleStudentsForSchedule(scheduleId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { scheduleId } = await params;
  const { studentIds } = await request.json();
  if (!Array.isArray(studentIds)) {
    return NextResponse.json({ error: 'studentIds must be an array' }, { status: 400 });
  }

  try {
    const result = await setEnrollmentsForSchedule(scheduleId, studentIds, actor);
    return NextResponse.json({ studentIds: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
