import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { getTeacherCheckInStatus, checkInTeacher } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { toLocalDateStr } from '@/lib/attendance';

// GET/POST /api/attendance/check-in — a Teacher marking their OWN
// attendance. Deliberately requireTeacher() (a real signed-in session, web
// or mobile), never the dashboard-toggle fallback other Teacher routes use
// — self-check-in only makes sense for an actual signed-in teacher, not a
// SchoolAdmin previewing "as Teacher".
export async function GET() {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const schoolId = await resolveSchoolId();
  const status = await getTeacherCheckInStatus(actor.teacherId, schoolId, toLocalDateStr(new Date()));
  return NextResponse.json(status);
}

export async function POST() {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const result = await checkInTeacher(actor);
  return NextResponse.json(result);
}
