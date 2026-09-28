import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac';
import { getTeacherAttendanceForDate, saveTeacherAttendance } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/staff-attendance?date=YYYY-MM-DD — admin-only, same as the
// student Daily Attendance module's marking screen. Not a Teacher-facing
// route at all (a teacher never marks their own or a colleague's
// attendance) — Teacher holds attendance.teacher.view/.mark too, but only
// for their own self-check-in (/api/attendance/check-in), so both handlers
// below explicitly block roleKey === 'Teacher' on top of the permission
// check, same pattern as the Students module's admin-only full-record
// routes.
export async function GET(request) {
  const { user, error } = await requirePermission('attendance.teacher.view');
  if (error) return error;
  if (user.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required.' }, { status: 400 });
  }

  const data = await getTeacherAttendanceForDate(await resolveSchoolId(), date);
  return NextResponse.json(data);
}

export async function POST(request) {
  const { user, error } = await requirePermission('attendance.teacher.mark');
  if (error) return error;
  if (user.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { date, records } = await request.json();

  try {
    const result = await saveTeacherAttendance(date, records, user.name);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
