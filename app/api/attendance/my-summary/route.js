import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { getTeacherAttendanceSummary } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/attendance/my-summary?month=YYYY-MM — a Teacher's own Present/
// Absent/Leave day counts for one month (defaults to the current month).
// Real signed-in Teacher session only, same as /api/attendance/check-in —
// self-service, never the dashboard-toggle fallback.
export async function GET(request) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const summary = await getTeacherAttendanceSummary(actor.teacherId, await resolveSchoolId(), month);
  return NextResponse.json({ month, ...summary });
}
