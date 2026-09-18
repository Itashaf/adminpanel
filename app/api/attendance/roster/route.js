import { NextResponse } from 'next/server';
import { getStudentsForClassSection, getAttendanceRecord, computeAttendanceAccess } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
import { getSchoolSettings } from '@/lib/schoolSettings';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('session');
  const date = searchParams.get('date');
  const className = searchParams.get('class');
  const sectionName = searchParams.get('section');

  if (!academicSession || !date || !className || sectionName === null) {
    return NextResponse.json({ error: 'Missing required filters' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  if (currentUser.role === 'Teacher' && !isClassInTeacherScope(getTeacherClassScope(currentUser), academicSession, className, sectionName)) {
    return NextResponse.json({ error: 'You can only view your own assigned class and section.' }, { status: 403 });
  }

  const [students, existingRecord, schoolSettings] = await Promise.all([
    getStudentsForClassSection(className, sectionName, academicSession),
    getAttendanceRecord(academicSession, date, className, sectionName),
    getSchoolSettings(),
  ]);

  const access = computeAttendanceAccess({ record: existingRecord, role: currentUser.role, date, schoolSettings });
  // Computed regardless of who's actually viewing, so an Admin (always
  // `access.allowed`) can still see whether *a teacher* is currently locked
  // out of this record and would need an unlock.
  const teacherAccess = computeAttendanceAccess({ record: existingRecord, role: 'Teacher', date, schoolSettings });

  return NextResponse.json({
    students,
    existingRecord,
    // Plain boolean alongside `existingRecord` (which the mobile client also
    // uses to prefill each student's saved status) — a dedicated flag reads
    // clearer at call sites that only care "has today's attendance been
    // taken at all", not the record's contents.
    attendanceTaken: Boolean(existingRecord),
    access,
    teacherAccess,
    attendanceSettings: {
      deadlineTime: schoolSettings.attendanceDeadlineTime,
      graceMinutes: schoolSettings.attendanceEditGraceMinutes,
    },
  });
}
