import { NextResponse } from 'next/server';
import { saveAttendance, getAttendanceRecord, computeAttendanceAccess, getStudentsForClassSection, ATTENDANCE_STATUSES } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope } from '@/lib/roleGuard';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function POST(request) {
  // Permission gate first (task 26) — blocks any role that shouldn't mark
  // attendance at all (e.g. Parent, who only holds attendance.student.view)
  // before the class-scope check below even runs. Kept as an added first
  // check, not a replacement — the classTeacherOf scope check right after
  // still needs getCurrentUserInfo()'s own resolution (the RBAC actor here
  // doesn't carry classTeacherOf), so both run.
  const { error: permError } = await requirePermission('attendance.student.mark');
  if (permError) return permError;

  const data = await readJson(request);

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

  // Sunday is a school holiday — no attendance for anyone, Teacher or Admin.
  if (new Date(`${data.date}T00:00:00`).getDay() === 0) {
    return NextResponse.json({ error: 'Sunday is a holiday — attendance cannot be marked.' }, { status: 400 });
  }

  // Authoritative enforcement — the client also disables Save for a locked
  // Teacher view, but that's UX only; this is what actually stops the write.
  const access = computeAttendanceAccess({ record: existingRecord, role: currentUser.role, date: data.date, schoolSettings });
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  // The saved record is built only from checked values. `markedBy` is the
  // signed-in user's own name (it used to be whatever the browser sent), and
  // every row must be a student of THIS class and section with a real status.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date)) || !Array.isArray(data.records)) {
    return NextResponse.json({ error: 'Invalid date or records.' }, { status: 400 });
  }
  const roster = await getStudentsForClassSection(data.className, data.sectionName, data.academicSession);
  const rosterIds = new Set(roster.map((s) => s.id));
  const seen = new Set();
  const records = [];
  for (const row of data.records) {
    const studentId = row?.studentId;
    if (typeof studentId !== 'string' || !rosterIds.has(studentId) || seen.has(studentId)) {
      return NextResponse.json({ error: 'Attendance includes a student who is not in this class and section.' }, { status: 400 });
    }
    if (!ATTENDANCE_STATUSES.includes(row.status)) {
      return NextResponse.json({ error: 'Invalid attendance status.' }, { status: 400 });
    }
    seen.add(studentId);
    records.push({ studentId, status: row.status, remark: typeof row.remark === 'string' ? row.remark.slice(0, 200) : '' });
  }

  // `loadedMarkedAt` is sent by the web board: the markedAt of the record it loaded (null = none).
  const expectedMarkedAt = 'loadedMarkedAt' in data && (data.loadedMarkedAt === null || typeof data.loadedMarkedAt === 'string') ? data.loadedMarkedAt : undefined;
  try {
    const saved = await saveAttendance({
      academicSession: data.academicSession,
      date: data.date,
      className: data.className,
      sectionName: data.sectionName,
      records,
      markedBy: currentUser.name || 'Staff',
      expectedMarkedAt,
    });
    return NextResponse.json(saved);
  } catch (err) {
    if (err.code === 'ATTENDANCE_CONFLICT') return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
