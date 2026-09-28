import prisma from '../db';
import { resolveSchoolId } from '../auth/schoolContext';
import { getStudentAttendanceSessionStats } from '../attendance';
import { getStudentSubjectPerformance } from './subjectTests';
import { assertClassTeacherScope } from './monthlyReports';

const HOLISTIC_CATEGORIES = ['discipline', 'homeworkCompletion', 'englishCommunication', 'punctuality', 'hygiene'];
const OVERALL_RATING_VALUES = ['EXCELLENT', 'GOOD', 'IMPROVING', 'SUPPORT_NEEDED'];
const REMARK_MAX_LENGTH = 1000; // a yearly remark is a longer final summary, not a monthly note

// Same 90/75/60 bands as Subject Tests — a subject's yearly average maps
// to a letter grade for the Yearly PDF/dashboard's "Grade" column.
function gradeFor(percent) {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'B';
  return 'C';
}

async function getOrCreateYearlyReport(currentUser, studentId, academicSession) {
  const schoolId = await resolveSchoolId();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) throw new Error('Student not found.');

  assertClassTeacherScope(currentUser, { className: student.class, sectionName: student.section });

  const existing = await prisma.yearlyReport.findUnique({ where: { studentId_academicSession: { studentId, academicSession } } });
  if (existing) return { report: existing, student };

  const created = await prisma.yearlyReport.create({ data: { schoolId, studentId, academicSession } });
  return { report: created, student };
}

function assertNotLocked(report) {
  if (report.status === 'LOCKED') throw new Error('This report is locked and cannot be edited.');
}

// Combines every monthly holistic rating for the session into one
// per-category value by majority vote — the most common rating wins; a
// tie favors whichever appears first alphabetically among the tied values
// (deterministic, not "whichever Prisma happened to return first").
function majorityHolistic(rows) {
  const result = {};
  for (const category of HOLISTIC_CATEGORIES) {
    const counts = {};
    for (const row of rows) {
      const value = row[category];
      if (value) counts[value] = (counts[value] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    result[category] = entries[0]?.[0] || null;
  }
  return result;
}

function average(numbers) {
  return numbers.length ? Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 10) / 10 : 0;
}

// The month -> academic% growth timeline — one point per month that has a
// MonthlyReport, in month order. Built from live per-month Subject Test
// data (getStudentSubjectPerformance), not from any monthly snapshot, so
// it reflects the same "attendance/academic always live" rule the monthly
// report itself follows — a mark correction after the fact updates the
// trend too, whether or not that month's report was ever locked.
async function buildGrowthTrend(studentId, academicSession, months) {
  const trend = [];
  for (const month of months) {
    const subjectPerf = await getStudentSubjectPerformance(studentId, academicSession, month);
    trend.push({ month, academicPercent: average(subjectPerf.map((s) => s.averagePercent)) });
  }
  return trend;
}

// The full Screen — student header, live yearly attendance, aggregated
// academic summary (with letter grades), combined activities, averaged
// holistic ratings, growth trend, and whatever's been set for the final
// rating/remark. Same "attendance never frozen" rule as Monthly — always
// computed fresh, even for a LOCKED report.
export async function getYearlyReport(currentUser, studentId, academicSession) {
  const { report, student } = await getOrCreateYearlyReport(currentUser, studentId, academicSession);

  const monthlyReports = await prisma.monthlyReport.findMany({
    where: { studentId, academicSession },
    orderBy: { month: 'asc' },
    select: { month: true },
  });
  const months = monthlyReports.map((r) => r.month);

  const isLocked = report.status === 'LOCKED' && report.snapshot;

  const [attendance, academicPerformance, activities, holisticRows, growthTrend] = await Promise.all([
    getStudentAttendanceSessionStats(studentId),
    isLocked ? Promise.resolve(report.snapshot.academicPerformance) : getStudentSubjectPerformance(studentId, academicSession),
    isLocked
      ? Promise.resolve(report.snapshot.activities)
      : prisma.monthlyReportActivity.findMany({ where: { monthlyReport: { studentId, academicSession } }, orderBy: { createdAt: 'asc' } }),
    isLocked ? null : prisma.monthlyReportHolistic.findMany({ where: { monthlyReport: { studentId, academicSession } } }),
    isLocked ? Promise.resolve(report.snapshot.growthTrend) : buildGrowthTrend(studentId, academicSession, months),
  ]);

  const holistic = isLocked ? report.snapshot.holistic : majorityHolistic(holisticRows || []);
  const academicWithGrades = academicPerformance.map((s) => ({ ...s, grade: gradeFor(s.averagePercent) }));

  return {
    id: report.id,
    studentId: student.id,
    admissionId: student.admissionId,
    studentName: `${student.firstName} ${student.lastName}`,
    photoUrl: student.photoUrl,
    className: student.class,
    sectionName: student.section,
    academicSession,
    status: report.status,
    finalRating: report.finalRating,
    teacherRemark: report.teacherRemark,
    lockedAt: report.lockedAt,
    attendance: attendance
      ? { workingDays: attendance.total, presentDays: attendance.Present, absentDays: attendance.Absent, percent: attendance.percent }
      : { workingDays: 0, presentDays: 0, absentDays: 0, percent: 0 },
    academicPerformance: academicWithGrades,
    activities: activities || [],
    holistic,
    growthTrend: growthTrend || [],
    monthsReported: months.length,
  };
}

export async function setYearlyRating(currentUser, studentId, academicSession, finalRating) {
  if (!OVERALL_RATING_VALUES.includes(finalRating)) throw new Error('Invalid final rating.');
  const { report } = await getOrCreateYearlyReport(currentUser, studentId, academicSession);
  assertNotLocked(report);
  return prisma.yearlyReport.update({ where: { id: report.id }, data: { finalRating, status: 'GENERATED' } });
}

export async function setYearlyRemark(currentUser, studentId, academicSession, teacherRemark) {
  if (teacherRemark && teacherRemark.length > REMARK_MAX_LENGTH) {
    throw new Error(`Teacher remark must be ${REMARK_MAX_LENGTH} characters or fewer.`);
  }
  const { report } = await getOrCreateYearlyReport(currentUser, studentId, academicSession);
  assertNotLocked(report);
  return prisma.yearlyReport.update({ where: { id: report.id }, data: { teacherRemark: teacherRemark || '', status: 'GENERATED' } });
}

// Freezes academic/activities/holistic/growthTrend into `snapshot` —
// attendance is never included, same rule and same reasoning as Monthly
// Report locking.
export async function lockYearlyReport(currentUser, studentId, academicSession, actorId) {
  const { report } = await getOrCreateYearlyReport(currentUser, studentId, academicSession);
  if (report.status === 'LOCKED') throw new Error('This report is already locked.');

  const full = await getYearlyReport(currentUser, studentId, academicSession);

  const [locked] = await prisma.$transaction([
    prisma.yearlyReport.update({
      where: { id: report.id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedByUserId: actorId,
        generatedAt: report.generatedAt || new Date(),
        snapshot: {
          academicPerformance: full.academicPerformance,
          activities: full.activities,
          holistic: full.holistic,
          growthTrend: full.growthTrend,
        },
      },
    }),
    prisma.reportLock.create({ data: { reportKind: 'YEARLY', reportId: report.id, action: 'LOCKED', userId: actorId } }),
  ]);
  return locked;
}

// Admin/Principal only — enforced by the caller (route), same pattern as
// unlockMonthlyReport.
export async function unlockYearlyReport(studentId, academicSession, actorId) {
  const schoolId = await resolveSchoolId();
  const report = await prisma.yearlyReport.findFirst({ where: { schoolId, studentId, academicSession } });
  if (!report) throw new Error('Report not found.');
  if (report.status !== 'LOCKED') throw new Error('This report is not locked.');

  const [unlocked] = await prisma.$transaction([
    prisma.yearlyReport.update({ where: { id: report.id }, data: { status: 'GENERATED', lockedAt: null, lockedByUserId: null } }),
    prisma.reportLock.create({ data: { reportKind: 'YEARLY', reportId: report.id, action: 'UNLOCKED', userId: actorId } }),
  ]);
  return unlocked;
}

// Screen 1 — Yearly Dashboard's student table.
export async function getYearlyReportDashboard({ academicSession, className = '', sectionName = '', search = '', currentUser = null }) {
  const schoolId = await resolveSchoolId();
  const scopePairs = currentUser?.role === 'Teacher' ? currentUser.classTeacherOf || [] : null;

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      academicSession,
      status: 'Active',
      ...(className ? { class: className } : {}),
      ...(sectionName ? { section: sectionName } : {}),
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

  const reports = await prisma.yearlyReport.findMany({ where: { schoolId, academicSession, studentId: { in: students.map((s) => s.id) } } });
  const reportByStudentId = new Map(reports.map((r) => [r.studentId, r]));

  const rows = await Promise.all(
    students.map(async (s) => {
      const [attendance, subjectPerf, activitiesCount] = await Promise.all([
        getStudentAttendanceSessionStats(s.id),
        getStudentSubjectPerformance(s.id, academicSession),
        prisma.monthlyReportActivity.count({ where: { monthlyReport: { studentId: s.id, academicSession } } }),
      ]);
      const awardsCount = await prisma.monthlyReportActivity.count({
        where: { monthlyReport: { studentId: s.id, academicSession }, achievement: { not: 'PARTICIPANT' } },
      });
      const report = reportByStudentId.get(s.id);
      return {
        studentId: s.id,
        admissionId: s.admissionId,
        studentName: `${s.firstName} ${s.lastName}`,
        className: s.class,
        sectionName: s.section,
        attendancePercent: attendance?.percent ?? 0,
        academicAverage: average(subjectPerf.map((sub) => sub.averagePercent)),
        activitiesCount,
        awardsCount,
        finalRating: report?.finalRating || null,
        status: report?.status || 'PENDING',
      };
    })
  );

  return {
    rows,
    cards: {
      totalStudents: students.length,
      reportsGenerated: rows.filter((r) => r.status === 'GENERATED' || r.status === 'LOCKED').length,
      reportsPending: rows.filter((r) => r.status === 'PENDING' || r.status === 'DRAFT').length,
    },
  };
}
