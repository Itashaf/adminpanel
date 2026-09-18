import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getAllStudents } from './students';
import { toLocalDateStr } from './dateUtils';

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Leave'];

export { toLocalDateStr };

export async function getStudentsForClassSection(className, sectionName, academicSession) {
  const students = await getAllStudents(await resolveSchoolId());
  return students
    .filter(
      (s) => s.class === className && s.section === sectionName && s.academicSession === academicSession && s.status === 'Active'
    )
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      firstName: s.firstName,
      lastName: [s.middleName, s.lastName].filter(Boolean).join(' '),
      initials: s.initials,
      admissionId: s.admissionId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function decorateAttendance(row) {
  return {
    id: row.id,
    academicSession: row.academicSession,
    date: row.date,
    className: row.className,
    sectionName: row.sectionName,
    markedBy: row.markedBy,
    markedAt: row.markedAt.toISOString(),
    manuallyUnlocked: row.manuallyUnlocked,
    records: row.records,
  };
}

export async function getAttendanceRecord(academicSession, date, className, sectionName) {
  const row = await prisma.attendance.findFirst({
    where: { schoolId: await resolveSchoolId(), academicSession, date, className, sectionName },
  });
  return row ? decorateAttendance(row) : null;
}

export async function getAttendanceRecordById(id) {
  const row = await prisma.attendance.findFirst({ where: { id, schoolId: await resolveSchoolId() } });
  return row ? decorateAttendance(row) : null;
}

export async function saveAttendance({ academicSession, date, className, sectionName, records, markedBy }) {
  const schoolId = await resolveSchoolId();
  // A fresh save always starts a fresh (re-locked) grace-period window — if
  // an admin had unlocked the previous version for a teacher, that unlock
  // was "spent" the moment it got used to save again.
  const row = await prisma.attendance.upsert({
    where: {
      schoolId_academicSession_date_className_sectionName: { schoolId, academicSession, date, className, sectionName },
    },
    update: { markedBy, markedAt: new Date(), manuallyUnlocked: false, records },
    create: { schoolId, academicSession, date, className, sectionName, markedBy, markedAt: new Date(), records },
  });
  return decorateAttendance(row);
}

export async function setAttendanceLock(id, manuallyUnlocked) {
  try {
    const row = await prisma.attendance.update({ where: { id }, data: { manuallyUnlocked } });
    return decorateAttendance(row);
  } catch {
    return null;
  }
}

function parseTimeToDate(timeString, referenceDate) {
  const [hour, minute] = (timeString || '14:00').split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function formatTime12h(timeString) {
  const [hour, minute] = (timeString || '14:00').split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

// The Teacher/Admin attendance-permission matrix (see the School Settings >
// Attendance Rules page for the two configurable inputs this reads):
//   - Admin: always allowed, no time limit, can edit anytime, can override.
//   - Teacher: can only mark TODAY's attendance, only before the deadline;
//     once saved, can only edit within the grace period after markedAt —
//     unless an admin has manually unlocked this exact record.
// `now` is injectable for tests; defaults to the real clock.
// Temporarily off — flip to true to restore the Teacher deadline/grace-period
// matrix below (School Settings > Attendance Rules' two inputs stay
// configurable either way, they just aren't enforced while this is false).
const ATTENDANCE_LOCK_ENABLED = false;

export function computeAttendanceAccess({ record, role, date, schoolSettings, now = new Date() }) {
  if (!ATTENDANCE_LOCK_ENABLED) {
    return { allowed: true, reason: '' };
  }

  if (role !== 'Teacher') {
    return { allowed: true, reason: '' };
  }

  if (!record) {
    const todayStr = toLocalDateStr(now);
    if (date !== todayStr) {
      return { allowed: false, reason: 'Teachers can only mark attendance for today. Ask your admin to mark a different date.' };
    }
    const deadline = parseTimeToDate(schoolSettings.attendanceDeadlineTime, now);
    if (now > deadline) {
      return {
        allowed: false,
        reason: `The attendance window closed at ${formatTime12h(schoolSettings.attendanceDeadlineTime)} today. Ask your admin to mark or unlock it.`,
      };
    }
    return { allowed: true, reason: '' };
  }

  if (record.manuallyUnlocked) {
    return { allowed: true, reason: '' };
  }

  // Hard "today only" cutoff for a Teacher's own update path — the create
  // path above already refuses any non-today date, but that alone doesn't
  // stop a Teacher from later editing an EXISTING record that happens not to
  // be for today (e.g. one an admin marked directly for a past date) if the
  // grace window were ever configured long enough to still be open. A
  // Teacher's write access to attendance never extends past today, full stop
  // — an admin's own unlock (manuallyUnlocked, checked above) is the only way
  // around it.
  const todayStr = toLocalDateStr(now);
  if (date !== todayStr) {
    return { allowed: false, reason: 'Teachers can only update attendance for today. Ask your admin to update a different date.' };
  }

  const graceMinutes = Number(schoolSettings.attendanceEditGraceMinutes) || 30;
  const graceEnds = new Date(new Date(record.markedAt).getTime() + graceMinutes * 60000);
  if (now > graceEnds) {
    return {
      allowed: false,
      reason: `The ${graceMinutes}-minute edit window has passed. Ask your admin to unlock editing.`,
    };
  }

  return { allowed: true, reason: '' };
}

// --- Reporting -------------------------------------------------------------
function dateRange(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    if (cursor.getDay() !== 0) dates.push(toLocalDateStr(cursor)); // skip Sundays
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// One query per report (not one per student per date, which the old
// in-memory version's per-lookup `ATTENDANCE.find()` could get away with but
// a real DB round-trip cannot) — fetches every real saved Attendance row in
// the requested range up front, keyed by `date|className|sectionName` so
// `statusFromMap` below stays a synchronous in-memory lookup, same shape as
// the original `statusFor`.
async function fetchAttendanceMap({ academicSession, from, to, className, sectionName }) {
  const where = { schoolId: await resolveSchoolId(), academicSession, date: { gte: from, lte: to } };
  if (className) where.className = className;
  if (sectionName) where.sectionName = sectionName;
  const rows = await prisma.attendance.findMany({ where });

  const map = new Map();
  for (const row of rows) {
    map.set(`${row.date}|${row.className}|${row.sectionName}`, row.records);
  }
  return map;
}

// `null` when nobody ever actually marked attendance for this student on
// this date — no fabricated fallback. Every consumer downstream (summarize,
// and the month-grid in getStudentAttendanceStats) already treats `null` as
// "no data" rather than assuming every day has some status.
function statusFromMap(attendanceMap, student, dateStr) {
  const records = attendanceMap.get(`${dateStr}|${student.class}|${student.section}`);
  const savedEntry = records?.find((rec) => rec.studentId === student.id);
  return savedEntry?.status || null;
}

// Only real, marked days count toward `total`/the percentage — a day
// nobody ever took attendance for is excluded entirely, not counted as
// Present/Absent/anything. This is why `total` here can be smaller than the
// number of calendar days in the requested range.
function summarize(statuses) {
  const marked = statuses.filter(Boolean);
  const summary = { Present: 0, Absent: 0, Late: 0, Leave: 0, NA: 0 };
  marked.forEach((status) => {
    summary[status] = (summary[status] || 0) + 1;
  });
  const total = marked.length;
  // NA ("Not Applicable") doesn't count toward the attendance rate either way
  // — it means the day doesn't apply to this student (e.g. not yet enrolled),
  // not that they were marked absent.
  const countable = total - summary.NA;
  const percent = countable > 0 ? Math.round((summary.Present / countable) * 1000) / 10 : 0;
  return { total, ...summary, percent };
}

// `allowedClasses` is the Teacher-scoping hook: a Teacher's Class dropdown
// only ever *offers* their own classes, but leaving it on the "All Classes"
// default previously fell straight through to every class in the school —
// the dropdown option list was scoped, the actual query wasn't. Passing
// `allowedClasses` (the Teacher's own class names) here closes that gap
// regardless of what classFilter/sectionFilter the UI happens to be set to.
async function relevantStudents({ academicSession, classFilter, sectionFilter, genderFilter, search, allowedClasses }) {
  const students = await getAllStudents(await resolveSchoolId());
  const query = (search || '').trim().toLowerCase();
  return students.filter((s) => {
    if (s.academicSession !== academicSession || s.status !== 'Active') return false;
    if (allowedClasses && !allowedClasses.includes(s.class)) return false;
    if (classFilter && classFilter !== 'All Classes' && s.class !== classFilter) return false;
    if (sectionFilter && sectionFilter !== 'All Sections' && s.section !== sectionFilter) return false;
    if (genderFilter && genderFilter !== 'All' && s.gender !== genderFilter) return false;
    if (query && !`${s.firstName} ${s.lastName}`.toLowerCase().includes(query) && !s.admissionId.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

export async function getAttendanceSummary(filters) {
  const { academicSession, from, to } = filters;
  const students = await relevantStudents(filters);
  const dates = dateRange(from, to);
  const attendanceMap = await fetchAttendanceMap({ academicSession, from, to });

  const statuses = [];
  for (const student of students) {
    for (const date of dates) {
      statuses.push(statusFromMap(attendanceMap, student, date));
    }
  }

  return summarize(statuses);
}

export async function getClassAttendancePerformance({ academicSession, from, to, allowedClasses }) {
  const students = (await getAllStudents(await resolveSchoolId())).filter(
    (s) => s.academicSession === academicSession && s.status === 'Active'
  );
  const dates = dateRange(from, to);
  const attendanceMap = await fetchAttendanceMap({ academicSession, from, to });
  const classNames = [...new Set(students.map((s) => s.class))]
    .filter((name) => !allowedClasses || allowedClasses.includes(name))
    .sort();

  const classPerformance = [];
  for (const className of classNames) {
    const classStudents = students.filter((s) => s.class === className);
    const sectionNames = [...new Set(classStudents.map((s) => s.section))].sort();

    const sections = [];
    const classStatuses = [];
    for (const sectionName of sectionNames) {
      const sectionStudents = classStudents.filter((s) => s.section === sectionName);
      const sectionStatuses = [];
      for (const student of sectionStudents) {
        for (const date of dates) {
          const status = statusFromMap(attendanceMap, student, date);
          sectionStatuses.push(status);
          classStatuses.push(status);
        }
      }
      sections.push({ sectionName, ...summarize(sectionStatuses) });
    }

    classPerformance.push({ className, sections, ...summarize(classStatuses) });
  }

  return classPerformance.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
}

export async function getStudentAttendanceReport(filters) {
  const { academicSession, from, to } = filters;
  const students = await relevantStudents(filters);
  const dates = dateRange(from, to);
  const attendanceMap = await fetchAttendanceMap({ academicSession, from, to });

  const rows = [];
  for (const student of students) {
    const statuses = dates.map((date) => statusFromMap(attendanceMap, student, date));
    const summary = summarize(statuses);
    rows.push({
      studentId: student.id,
      admissionId: student.admissionId,
      name: `${student.firstName} ${student.lastName}`,
      initials: student.initials,
      classSection: `${student.class.replace('Class ', '')}${student.section}`,
      className: student.class,
      section: student.section,
      ...summary,
    });
  }

  return rows.sort((a, b) => b.percent - a.percent);
}

// One point per calendar day in range (the same weekday-skip-Sunday
// `dateRange` as every other report) — the line chart's daily series.
// Weekly is derived client-side from this by grouping every 7 points, not a
// separate query, since the underlying attendanceMap is already fetched.
export async function getAttendanceTrend(filters) {
  const { academicSession, from, to } = filters;
  const students = await relevantStudents(filters);
  const dates = dateRange(from, to);
  const attendanceMap = await fetchAttendanceMap({ academicSession, from, to });

  return dates.map((date) => {
    const statuses = students.map((student) => statusFromMap(attendanceMap, student, date));
    const summary = summarize(statuses);
    return { date, percent: summary.percent, present: summary.Present, total: summary.total };
  });
}

// Returns every calendar day of the requested month (`days`), not just a
// capped "recent" tail — the Student Profile's Attendance tab renders a full
// month grid (see StudentAttendanceTab.jsx), so it needs a status (or `null`
// for a not-yet-happened day) per day-of-month, not a truncated list.
export async function getStudentAttendanceStats(studentId, { academicSession, month } = {}) {
  const students = await getAllStudents(await resolveSchoolId());
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const session = academicSession || student.academicSession;
  const todayStr = toLocalDateStr(new Date());
  const monthKey = month || todayStr.slice(0, 7);
  const [year, monthNum] = monthKey.split('-').map(Number);
  const monthStart = `${monthKey}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

  const attendanceMap = await fetchAttendanceMap({
    academicSession: session,
    from: monthStart,
    to: monthEnd,
    className: student.class,
    sectionName: student.section,
  });

  const statuses = [];
  const days = [];
  for (const date of dateRange(monthStart, monthEnd)) {
    if (date > todayStr) {
      days.push({ date, status: null });
      continue;
    }
    const status = statusFromMap(attendanceMap, student, date);
    statuses.push(status);
    days.push({ date, status });
  }

  const summary = summarize(statuses);
  return { ...summary, days };
}

// Same shape as getStudentAttendanceStats' summary (no `days` list — a full
// session can span months, so a day-by-day grid isn't useful here), but
// totalled across the student's entire academic session instead of one
// month — "how many days present/absent this whole session" (the Parent
// Portal's own month view only ever answers that per-month, one month at a
// time).
export async function getStudentAttendanceSessionStats(studentId) {
  const students = await getAllStudents(await resolveSchoolId());
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const schoolId = await resolveSchoolId();
  const academicSessionRow = await prisma.academicSession.findFirst({
    where: { schoolId, name: student.academicSession },
  });

  const todayStr = toLocalDateStr(new Date());
  const from = academicSessionRow?.startDate || `${todayStr.slice(0, 4)}-01-01`;
  const sessionEnd = academicSessionRow?.endDate || todayStr;
  // Never walk past today — a session's endDate is usually months in the
  // future (e.g. next March), and there's nothing marked for days that
  // haven't happened yet.
  const to = sessionEnd < todayStr ? sessionEnd : todayStr;

  const attendanceMap = await fetchAttendanceMap({
    academicSession: student.academicSession,
    from,
    to,
    className: student.class,
    sectionName: student.section,
  });

  const statuses = dateRange(from, to).map((date) => statusFromMap(attendanceMap, student, date));
  return summarize(statuses);
}
