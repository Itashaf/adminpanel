import { NextResponse } from 'next/server';
import { saveAttendance, getAttendanceRecord, computeAttendanceAccess } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope } from '@/lib/roleGuard';
import { getSchoolSettings } from '@/lib/schoolSettings';

export async function POST(request) {
  const data = await request.json();

  if (!data.academicSession || !data.date || !data.className || data.sectionName === undefined || data.sectionName === null || !data.records) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // A real signed-in session must win over lib/currentUser.js's process-wide
  // demo toggle — same fix as marks-entry/exams; also the only source that
  // actually carries classTeacherOf (see lib/iam.js).
  const [currentUser, schoolSettings, existingRecord] = await Promise.all([
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
    getSchoolSettings(),
    getAttendanceRecord(data.academicSession, data.date, data.className, data.sectionName),
  ]);

  // Authoritative enforcement — a Teacher can only ever mark attendance for a
  // section they're the Class Teacher of (currentUser.classTeacherOf), not
  // merely a class they teach a subject in. The client's class picker is
  // already scoped to just those, but that's UX only; this is what actually
  // stops a Teacher from POSTing straight to someone else's class.
  if (
    currentUser.role === 'Teacher' &&
    !isClassInTeacherScope(currentUser.classTeacherOf || [], data.academicSession, data.className, data.sectionName)
  ) {
    return NextResponse.json({ error: 'You can only mark attendance for your own assigned class and section.' }, { status: 403 });
  }

  // Authoritative enforcement — the client also disables Save for a locked
  // Teacher view, but that's UX only; this is what actually stops the write.
  const access = computeAttendanceAccess({ record: existingRecord, role: currentUser.role, date: data.date, schoolSettings });
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const saved = await saveAttendance(data);
  return NextResponse.json(saved);
}
