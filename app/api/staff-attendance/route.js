import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { getTeacherAttendanceForDate, saveTeacherAttendance } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/staff-attendance?date=YYYY-MM-DD — admin-only, same as the
// student Daily Attendance module's marking screen. Not a Teacher-facing
// route at all (a teacher never marks their own or a colleague's
// attendance).
export async function GET(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required.' }, { status: 400 });
  }

  const data = await getTeacherAttendanceForDate(await resolveSchoolId(), date);
  return NextResponse.json(data);
}

export async function POST(request) {
  const { actor, error } = await requireSchoolAdmin();
  if (error) return error;

  const { date, records } = await request.json();

  try {
    const result = await saveTeacherAttendance(date, records, actor.name);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
