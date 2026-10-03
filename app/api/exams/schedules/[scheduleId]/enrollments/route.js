import { NextResponse } from 'next/server';
import { getEligibleStudentsForSchedule, setEnrollmentsForSchedule } from '@/lib/examOptionalEnrollment';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

// GET/PUT /api/exams/schedules/[scheduleId]/enrollments — which students are
// enrolled in one optional/elective ExamSchedule (Class 11/12-style).
export async function GET(request, { params }) {
  const { error: authError } = await requirePermission('exams.manage');
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
  const { error: authError } = await requirePermission('exams.manage');
  if (authError) return authError;

  // See app/api/exams/route.js's same comment — lib/examOptionalEnrollment.js's
  // own assertIsAdmin checks the legacy `.role` shape, not requirePermission's
  // RBAC actor.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { scheduleId } = await params;
  const { studentIds } = await request.json();
  if (!Array.isArray(studentIds)) {
    return NextResponse.json({ error: 'studentIds must be an array' }, { status: 400 });
  }

  try {
    const result = await setEnrollmentsForSchedule(scheduleId, studentIds, currentUser);
    return NextResponse.json({ studentIds: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
