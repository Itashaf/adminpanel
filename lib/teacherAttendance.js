import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getAllTeachers } from './teachers';

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
// isn't blocked); anyone not yet marked defaults to 'Present', same
// first-open convention as Student attendance's roster.
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
        status: record?.status || (onLeaveIds.has(t.id) ? 'Leave' : 'Present'),
        remark: record?.remark || '',
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
