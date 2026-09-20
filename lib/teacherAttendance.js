import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getAllTeachers } from './teachers';
import { toLocalDateStr } from './attendance';

function decorate(row) {
  return {
    date: row.date,
    markedBy: row.markedBy,
    markedAt: row.markedAt.toISOString(),
    records: row.records,
  };
}

// Every active teacher in the school + their attendance status for one
// date. A teacher with an Approved leave covering this date is pre-filled
// 'Leave' (still editable — an admin correcting a mistaken leave record
// isn't blocked); anyone with neither an explicit record (self-check-in or a
// prior admin Save) nor an approved leave gets `status: null` — rendered as
// "Not Marked" rather than silently defaulting to Present, so the roster
// honestly shows who admin/the teacher hasn't actually accounted for yet.
export async function getTeacherAttendanceForDate(schoolId, date) {
  const [teachers, existing, approvedLeaves] = await Promise.all([
    getAllTeachers(schoolId),
    prisma.teacherAttendance.findUnique({ where: { schoolId_date: { schoolId, date } } }),
    prisma.teacherLeave.findMany({
      where: { schoolId, status: 'Approved', startDate: { lte: date }, endDate: { gte: date } },
      select: { teacherId: true },
    }),
  ]);

  const onLeaveIds = new Set(approvedLeaves.map((l) => l.teacherId));
  const existingMap = new Map((existing?.records || []).map((r) => [r.teacherId, r]));

  const roster = teachers
    .filter((t) => t.status === 'Active')
    .map((t) => {
      const record = existingMap.get(t.id);
      return {
        teacherId: t.id,
        name: `${t.firstName} ${t.lastName}`,
        employeeId: t.employeeId,
        photoUrl: t.photoUrl || null,
        designation: t.designation,
        subject: t.specialization || t.designation,
        status: record?.status || (onLeaveIds.has(t.id) ? 'Leave' : null),
        remark: record?.remark || '',
        checkInAt: record?.checkInAt || null,
      };
    });

  return {
    date,
    roster,
    isMarked: Boolean(existing),
    markedBy: existing?.markedBy || null,
    markedAt: existing?.markedAt ? existing.markedAt.toISOString() : null,
  };
}

export async function saveTeacherAttendance(date, records, markedByName) {
  if (!date || !Array.isArray(records) || records.length === 0) {
    throw new Error('Date and at least one attendance record are required.');
  }
  const schoolId = await resolveSchoolId();
  const row = await prisma.teacherAttendance.upsert({
    where: { schoolId_date: { schoolId, date } },
    update: { records, markedBy: markedByName, markedAt: new Date() },
    create: { schoolId, date, records, markedBy: markedByName, markedAt: new Date() },
  });
  return decorate(row);
}

// A Teacher's own status for today (or any date) — used to render the
// Dashboard's Check In button as either "Check In" or "Checked in at H:MM".
export async function getTeacherCheckInStatus(teacherId, schoolId, date) {
  const existing = await prisma.teacherAttendance.findUnique({ where: { schoolId_date: { schoolId, date } } });
  const record = (existing?.records || []).find((r) => r.teacherId === teacherId);
  return {
    date,
    checkedIn: Boolean(record?.checkInAt),
    checkInAt: record?.checkInAt || null,
    status: record?.status || null,
  };
}

// Self-service check-in — a Teacher marking their OWN attendance Present for
// today, distinct from checkInTeacher never touching another teacher's
// record: it only ever adds/replaces the calling teacher's own entry in that
// date's records array, leaving whatever an admin has already marked for
// everyone else untouched. Idempotent: checking in twice in one day just
// returns the original check-in time instead of overwriting it — a Teacher
// can't "re-check-in" to bump their recorded time later.
export async function checkInTeacher(currentUser) {
  const schoolId = await resolveSchoolId();
  const date = toLocalDateStr(new Date());

  const existing = await prisma.teacherAttendance.findUnique({ where: { schoolId_date: { schoolId, date } } });
  const records = existing?.records || [];
  const own = records.find((r) => r.teacherId === currentUser.teacherId);
  if (own?.checkInAt) {
    return { date, teacherId: currentUser.teacherId, status: own.status, checkInAt: own.checkInAt };
  }

  const checkInAt = new Date().toISOString();
  const updatedRecords = [
    ...records.filter((r) => r.teacherId !== currentUser.teacherId),
    { teacherId: currentUser.teacherId, status: 'Present', remark: own?.remark || '', checkInAt, checkInBy: 'self' },
  ];

  // Preserve an admin's own markedBy/markedAt if this date's row already
  // exists (a self-check-in must never look like the admin re-marked the
  // whole day) — only stamp the Teacher's own name when this is the very
  // first entry for the date.
  await prisma.teacherAttendance.upsert({
    where: { schoolId_date: { schoolId, date } },
    update: { records: updatedRecords },
    create: { schoolId, date, records: updatedRecords, markedBy: currentUser.name, markedAt: new Date() },
  });

  return { date, teacherId: currentUser.teacherId, status: 'Present', checkInAt };
}

// One teacher's monthly summary (monthPrefix e.g. '2026-09') — counts days
// actually marked, not calendar days, so a school that hasn't opened staff
// attendance for a date shows nothing for it rather than a false absence.
export async function getTeacherAttendanceSummary(teacherId, schoolId, monthPrefix) {
  const rows = await prisma.teacherAttendance.findMany({
    where: { schoolId, date: { startsWith: monthPrefix } },
    select: { records: true },
  });
  const summary = { Present: 0, Absent: 0, Leave: 0, total: 0 };
  rows.forEach((row) => {
    const record = (row.records || []).find((r) => r.teacherId === teacherId);
    if (!record) return;
    summary.total += 1;
    summary[record.status] = (summary[record.status] || 0) + 1;
  });
  return summary;
}
