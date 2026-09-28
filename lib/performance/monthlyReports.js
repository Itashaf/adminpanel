import prisma from '../db';
import { resolveSchoolId } from '../auth/schoolContext';
import { getStudentAttendanceStats } from '../attendance';
import { getStudentSubjectPerformance } from './subjectTests';

const HOLISTIC_CATEGORIES = ['discipline', 'homeworkCompletion', 'englishCommunication', 'punctuality', 'hygiene'];
const HOLISTIC_VALUES = ['EXCELLENT', 'GOOD', 'SUPPORT'];
const ACHIEVEMENT_VALUES = ['PARTICIPANT', 'FIRST', 'SECOND', 'THIRD', 'SPECIAL_MENTION'];
const OVERALL_RATING_VALUES = ['EXCELLENT', 'GOOD', 'IMPROVING', 'SUPPORT_NEEDED'];
const REMARK_MAX_LENGTH = 500;

// A Class Teacher may only touch a report for a class+section they're
// actually the Class Teacher of (currentUser.classTeacherOf — see
// lib/iam.js) — Admin/Principal unrestricted, same convention as
// assertTeacherCanTestSubject in subjectTests.js. This is also exactly
// where the spec's "Subject Teacher cannot fill Monthly Reports" gets
// enforced: a Subject-Teacher-only session has an empty classTeacherOf for
// that section and fails here, even though they hold the same permission
// key as a Class Teacher.
export function assertClassTeacherScope(currentUser, { className, sectionName }) {
  if (currentUser.role !== 'Teacher') return;
  const allowed = (currentUser.classTeacherOf || []).some((s) => s.class === className && s.section === sectionName);
  if (!allowed) {
    throw new Error('You are not the Class Teacher for this class/section.');
  }
}

function assertRemarkLength(text) {
  if (text && text.length > REMARK_MAX_LENGTH) {
    throw new Error(`Teacher remark must be ${REMARK_MAX_LENGTH} characters or fewer.`);
  }
}

// A report is auto-marked COMPLETED once every fillable section has at
// least one value — a soft status the UI can show, never a gate (spec:
// "no multiple approvals, no complex workflows" — Draft/Completed is
// informational, Lock is the only real state-changing action).
async function recomputeStatus(monthlyReportId) {
  const report = await prisma.monthlyReport.findUnique({
    where: { id: monthlyReportId },
    include: { activities: true, holistic: true, remarks: true },
  });
  if (!report || report.status === 'LOCKED') return report;

  const isComplete =
    report.activities.length > 0 && Boolean(report.holistic) && Boolean(report.remarks) && Boolean(report.overallRating);

  if (isComplete === (report.status === 'COMPLETED')) return report;
  return prisma.monthlyReport.update({
    where: { id: monthlyReportId },
    data: { status: isComplete ? 'COMPLETED' : 'DRAFT' },
    include: { activities: true, holistic: true, remarks: true },
  });
}

// Finds this student's report for the month, creating an empty DRAFT one
// on first touch — className/sectionName snapshot the student's CURRENT
// class/section at that moment (see MonthlyReport's schema comment: a
// later class transfer must not move a past report to a different
// dashboard filter).
async function getOrCreateMonthlyReport(currentUser, studentId, academicSession, month) {
  const schoolId = await resolveSchoolId();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) throw new Error('Student not found.');

  assertClassTeacherScope(currentUser, { className: student.class, sectionName: student.section });

  const existing = await prisma.monthlyReport.findUnique({
    where: { studentId_academicSession_month: { studentId, academicSession, month } },
  });
  if (existing) return { report: existing, student };

  const created = await prisma.monthlyReport.create({
    data: { schoolId, studentId, academicSession, month, className: student.class, sectionName: student.section },
  });
  return { report: created, student };
}

// The full Screen 2 assembly — student header, live attendance, live
// academic performance, and whatever's been filled into the 3 Class
// Teacher sections + rating. Attendance/academic are NEVER read from
// `snapshot`, even for a LOCKED report — computed fresh every call, per
// the explicit "locked report must still show real attendance" decision.
export async function getMonthlyReport(currentUser, studentId, academicSession, month) {
  const { report, student } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);

  const [attendance, academicPerformance, activities, holistic, remarks] = await Promise.all([
    getStudentAttendanceStats(studentId, { academicSession, month }),
    getStudentSubjectPerformance(studentId, academicSession, month),
    prisma.monthlyReportActivity.findMany({ where: { monthlyReportId: report.id }, orderBy: { createdAt: 'asc' } }),
    prisma.monthlyReportHolistic.findUnique({ where: { monthlyReportId: report.id } }),
    prisma.monthlyReportRemark.findUnique({ where: { monthlyReportId: report.id } }),
  ]);

  return {
    id: report.id,
    studentId: student.id,
    admissionId: student.admissionId,
    studentName: `${student.firstName} ${student.lastName}`,
    photoUrl: student.photoUrl,
    className: student.class,
    sectionName: student.section,
    academicSession,
    month,
    status: report.status,
    overallRating: report.overallRating,
    lockedAt: report.lockedAt,
    attendance: attendance
      ? { presentDays: attendance.Present, absentDays: attendance.Absent, lateDays: attendance.Late, percent: attendance.percent }
      : { presentDays: 0, absentDays: 0, lateDays: 0, percent: 0 },
    academicPerformance,
    activities,
    holistic,
    remarks,
  };
}

function assertNotLocked(report) {
  if (report.status === 'LOCKED') throw new Error('This report is locked and cannot be edited.');
}

export async function addActivity(currentUser, studentId, academicSession, month, { activityName, achievement }) {
  if (!activityName || !achievement) throw new Error('Activity name and achievement are required.');
  if (!ACHIEVEMENT_VALUES.includes(achievement)) throw new Error('Invalid achievement value.');

  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  const activity = await prisma.monthlyReportActivity.create({
    data: { monthlyReportId: report.id, activityName, achievement },
  });
  await recomputeStatus(report.id);
  return activity;
}

export async function removeActivity(currentUser, studentId, academicSession, month, activityId) {
  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  await prisma.monthlyReportActivity.delete({ where: { id: activityId } });
  await recomputeStatus(report.id);
}

export async function setHolistic(currentUser, studentId, academicSession, month, values) {
  for (const category of HOLISTIC_CATEGORIES) {
    if (!HOLISTIC_VALUES.includes(values[category])) {
      throw new Error(`Invalid value for ${category}.`);
    }
  }

  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  const holistic = await prisma.monthlyReportHolistic.upsert({
    where: { monthlyReportId: report.id },
    update: values,
    create: { monthlyReportId: report.id, ...values },
  });
  await recomputeStatus(report.id);
  return holistic;
}

export async function setRemarks(currentUser, studentId, academicSession, month, { strengthChips = [], improvementChips = [], remarkText = '' }) {
  assertRemarkLength(remarkText);

  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  const remarks = await prisma.monthlyReportRemark.upsert({
    where: { monthlyReportId: report.id },
    update: { strengthChips, improvementChips, remarkText },
    create: { monthlyReportId: report.id, strengthChips, improvementChips, remarkText },
  });
  await recomputeStatus(report.id);
  return remarks;
}

// Bulk-import specific — the Remarks sheet only ever provides free text
// (Admission No, Teacher Remark), never the strength/improvement chips.
// Overwriting the whole row via setRemarks would silently wipe any chips
// already picked through the UI (the exact "destructive quick-save merge"
// class of bug this project has hit before) — this merges the text in
// while leaving existing chips untouched.
export async function setRemarkText(currentUser, studentId, academicSession, month, remarkText) {
  assertRemarkLength(remarkText);

  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  const existing = await prisma.monthlyReportRemark.findUnique({ where: { monthlyReportId: report.id } });
  const remarks = await prisma.monthlyReportRemark.upsert({
    where: { monthlyReportId: report.id },
    update: { remarkText },
    create: { monthlyReportId: report.id, strengthChips: existing?.strengthChips || [], improvementChips: existing?.improvementChips || [], remarkText },
  });
  await recomputeStatus(report.id);
  return remarks;
}

export async function setOverallRating(currentUser, studentId, academicSession, month, overallRating) {
  if (!OVERALL_RATING_VALUES.includes(overallRating)) throw new Error('Invalid overall rating.');

  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  assertNotLocked(report);

  await prisma.monthlyReport.update({ where: { id: report.id }, data: { overallRating } });
  // recomputeStatus's own return already reflects the just-set rating (it
  // re-reads after the update above) — return that instead of the
  // pre-recompute row, so the response's `status` isn't stale by one write.
  return recomputeStatus(report.id);
}

// Freezes everything EXCEPT attendance into `snapshot` — academic
// performance, activities, holistic ratings, remarks. Attendance is
// recomputed live even for a LOCKED report (see getMonthlyReport above),
// per the explicit "locked report must still show real attendance"
// product decision. `actorId` is whatever stable id the caller resolved
// for the signed-in user (see the API route) — recorded on both the
// report itself and the ReportLock audit row.
export async function lockMonthlyReport(currentUser, studentId, academicSession, month, actorId) {
  const { report } = await getOrCreateMonthlyReport(currentUser, studentId, academicSession, month);
  if (report.status === 'LOCKED') throw new Error('This report is already locked.');

  const [academicPerformance, activities, holistic, remarks] = await Promise.all([
    getStudentSubjectPerformance(studentId, academicSession, month),
    prisma.monthlyReportActivity.findMany({ where: { monthlyReportId: report.id }, orderBy: { createdAt: 'asc' } }),
    prisma.monthlyReportHolistic.findUnique({ where: { monthlyReportId: report.id } }),
    prisma.monthlyReportRemark.findUnique({ where: { monthlyReportId: report.id } }),
  ]);

  const [locked] = await prisma.$transaction([
    prisma.monthlyReport.update({
      where: { id: report.id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedByUserId: actorId,
        snapshot: { academicPerformance, activities, holistic, remarks },
      },
    }),
    prisma.reportLock.create({
      data: { reportKind: 'MONTHLY', reportId: report.id, action: 'LOCKED', userId: actorId },
    }),
  ]);
  return locked;
}

// Admin/Principal only — enforced by the caller (route), not here, same
// "explicit role check on top of the permission check" pattern as every
// other shared-permission-key action in this app (e.g. attendance lock).
// Always audit-logged; never a silent status flip.
export async function unlockMonthlyReport(studentId, academicSession, month, actorId) {
  const schoolId = await resolveSchoolId();
  const report = await prisma.monthlyReport.findFirst({
    where: { schoolId, studentId, academicSession, month },
  });
  if (!report) throw new Error('Report not found.');
  if (report.status !== 'LOCKED') throw new Error('This report is not locked.');

  const [unlocked] = await prisma.$transaction([
    prisma.monthlyReport.update({
      where: { id: report.id },
      data: { status: 'COMPLETED', lockedAt: null, lockedByUserId: null },
    }),
    prisma.reportLock.create({
      data: { reportKind: 'MONTHLY', reportId: report.id, action: 'UNLOCKED', userId: actorId },
    }),
  ]);
  return unlocked;
}

// Screen 1 — the Monthly Report Dashboard's student table. One row per
// Active student in the class/section, joined against whatever
// MonthlyReport row already exists for this month (may not exist yet —
// "Pending" in that case, not an error).
// `currentUser` (optional) scopes a Teacher's dashboard to only the
// class/sections they're the Class Teacher of — same "own class teacher
// scope. Admin/Principal (or no currentUser, for a call site that already
// knows it's admin-tier) sees the whole school. Without this, a Teacher
// filtering to "All Classes" would have seen every student's summary row
// (attendance %/counts, not the report's actual content) despite only
// being able to edit their own — found while wiring bulk actions, which
// would otherwise let a Teacher select a checkbox for a student they can
// never actually lock.
export async function getMonthlyReportDashboard({ academicSession, month, className = '', sectionName = '', search = '', currentUser = null }) {
  const schoolId = await resolveSchoolId();
  const scopePairs = currentUser?.role === 'Teacher' ? currentUser.classTeacherOf || [] : null;

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      academicSession,
      status: 'Active',
      ...(className ? { class: className } : {}),
      ...(sectionName ? { section: sectionName } : {}),
      // Two independent OR conditions (scope, search) can't both be plain
      // `OR` keys on the same where object — the second would silently
      // clobber the first in the object literal. AND-of-ORs instead.
      ...(scopePairs || search
        ? {
            AND: [
              ...(scopePairs ? [{ OR: scopePairs.map((s) => ({ class: s.class, section: s.section, academicSession: s.academicSession })) }] : []),
              ...(search
                ? [{ OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { admissionId: { contains: search, mode: 'insensitive' } }] }]
                : []),
            ],
          }
        : {}),
    },
    select: { id: true, admissionId: true, firstName: true, lastName: true, class: true, section: true },
    orderBy: { firstName: 'asc' },
  });

  const reports = await prisma.monthlyReport.findMany({
    where: { schoolId, academicSession, month, studentId: { in: students.map((s) => s.id) } },
    include: { _count: { select: { activities: true } } },
  });
  const reportByStudentId = new Map(reports.map((r) => [r.studentId, r]));

  const rows = await Promise.all(
    students.map(async (s) => {
      const [attendance, testCount] = await Promise.all([
        getStudentAttendanceStats(s.id, { academicSession, month }),
        prisma.subjectTestMark.count({ where: { studentId: s.id, test: { schoolId, academicSession } } }),
      ]);
      const report = reportByStudentId.get(s.id);
      return {
        studentId: s.id,
        admissionId: s.admissionId,
        studentName: `${s.firstName} ${s.lastName}`,
        className: s.class,
        sectionName: s.section,
        attendancePercent: attendance?.percent ?? 0,
        testsCount: testCount,
        activitiesCount: report?._count.activities ?? 0,
        status: report?.status || 'PENDING',
      };
    })
  );

  return {
    rows,
    cards: {
      totalStudents: students.length,
      completedReports: rows.filter((r) => r.status === 'COMPLETED').length,
      pendingReports: rows.filter((r) => r.status === 'DRAFT' || r.status === 'PENDING').length,
      lockedReports: rows.filter((r) => r.status === 'LOCKED').length,
    },
  };
}
