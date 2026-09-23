import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getStudentAttendanceStats } from './attendance';
import { getSubjectNames } from './subjects';
import { getPublishedResultsForStudent } from './examResults';
import { getTeacherClassScope, isClassInTeacherScope } from './roleGuard';
import { FALLBACK_SUBJECTS, OVERALL_PERFORMANCE_OPTIONS, RATING_LEVELS, ACTIVITY_OPTIONS, BEHAVIOUR_CATEGORIES } from './assessmentConstants';

function monthKey(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function decorate(row) {
  return {
    id: row.id,
    studentId: row.studentId,
    className: row.className,
    sectionName: row.sectionName,
    month: row.month,
    year: row.year,
    attendancePercentage: row.attendancePercentage,
    overallPerformance: row.overallPerformance,
    overallTags: row.overallTags || [],
    overallRemark: row.overallRemark,
    behaviour: row.behaviour || {},
    academics: row.academics || [],
    activities: row.activities || { selectedActivities: [], achievementLevel: '', note: '' },
    parentCommunication: row.parentCommunication || {},
    status: row.status,
    submittedByName: row.submittedByName,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// A Teacher only ever sees/assesses students in their own class scope
// (assignments + classTeacherOf, same as Homework's rule — any subject
// teacher, not just the Class Teacher, per the module's own "Class Teacher:
// full access / Teacher: only own class" note, which this treats the same
// as every other class-scoped module in this app already does). Throws
// (never silently returns nothing) so a route can turn it into a 403.
function assertClassInScope(currentUser, className, sectionName, academicSession) {
  if (currentUser.role !== 'Teacher') return;
  const scope = getTeacherClassScope(currentUser);
  if (!isClassInTeacherScope(scope, academicSession, className, sectionName)) {
    throw new Error('You can only assess students in your own class.');
  }
}

// Every Active student in a class+section + their assessment status for one
// month — the Assessment Dashboard's table. A student with no row yet is
// "Not Started", not omitted, so admin/teacher see the whole roster's
// completion state at a glance.
//
// Query-level pagination (page/pageSize) — same reasoning as
// getStudentsPage in lib/students.js: only the current page's rows ever
// need the full student fields, so `skip`/`take` runs at the query instead
// of fetching the whole class and slicing in JS. `search` is also applied
// server-side (name/admission no.) so it keeps working across pages instead
// of only filtering whatever page happened to already be loaded.
//
// `stats` (completed/pending/needsAttention/completionPercent) always cover
// the WHOLE class, not just the current page — computed from a separate
// id-only student query + the class's full assessment rows, both cheap
// (id/status fields only), so pagination never makes the summary numbers
// wrong or page-dependent.
export async function getAssessmentsForClass(
  currentUser,
  { className, sectionName, academicSession, month, year, page = 1, pageSize = 20, search = '', statusFilter = 'all', sortOrder = 'asc' }
) {
  assertClassInScope(currentUser, className, sectionName, academicSession);
  const schoolId = await resolveSchoolId();

  const baseWhere = { schoolId, class: className, section: sectionName, academicSession, status: 'Active' };

  // Assessment rows fetched once, up front — both the class-wide stats and
  // the "Completed"/"Pending" tab filters (below) key off the same
  // completed-id set, so a Not Started student (no row at all) and a Draft
  // row both land in "Pending", matching the tab counts.
  const assessments = await prisma.studentAssessment.findMany({ where: { schoolId, className, sectionName, month, year } });
  const completedIds = assessments.filter((a) => a.status === 'COMPLETED').map((a) => a.studentId);

  const trimmedSearch = search.trim();
  const extraConditions = [];
  if (trimmedSearch) {
    extraConditions.push({
      OR: [
        { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
        { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
        { admissionId: { contains: trimmedSearch, mode: 'insensitive' } },
      ],
    });
  }
  if (statusFilter === 'completed') extraConditions.push({ id: { in: completedIds } });
  if (statusFilter === 'pending') extraConditions.push({ id: { notIn: completedIds } });
  const pageWhere = extraConditions.length > 0 ? { AND: [baseWhere, ...extraConditions] } : baseWhere;

  const [activeStudentIds, total, pageStudents] = await Promise.all([
    prisma.student.findMany({ where: baseWhere, select: { id: true } }),
    prisma.student.count({ where: pageWhere }),
    prisma.student.findMany({
      where: pageWhere,
      select: { id: true, firstName: true, lastName: true, admissionId: true, photoUrl: true },
      orderBy: { firstName: sortOrder === 'desc' ? 'desc' : 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const byStudent = new Map(assessments.map((a) => [a.studentId, a]));

  const roster = pageStudents.map((s) => {
    const assessment = byStudent.get(s.id);
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionId: s.admissionId,
      photoUrl: s.photoUrl || null,
      status: assessment ? (assessment.status === 'COMPLETED' ? 'Completed' : 'Draft') : 'Not Started',
      overallPerformance: assessment?.overallPerformance || '',
      updatedAt: assessment ? assessment.updatedAt.toISOString() : null,
      attendancePercentage: assessment?.attendancePercentage ?? null,
      // Per-section fill state for the dashboard table's quick-glance
      // Academic/Behaviour/Participation columns — "has at least one real
      // rating in that section", not "every field filled".
      sections: {
        academic: (assessment?.academics || []).some((row) => row.rating),
        behaviour: Object.values(assessment?.behaviour || {}).some(Boolean),
        participation: (assessment?.activities?.selectedActivities || []).length > 0,
      },
    };
  });

  const activeIds = new Set(activeStudentIds.map((s) => s.id));
  const classAssessments = assessments.filter((a) => activeIds.has(a.studentId));
  const classTotal = activeIds.size;
  const completed = classAssessments.filter((a) => a.status === 'COMPLETED').length;
  const pending = classTotal - completed;
  const needsAttention = classAssessments.filter((a) => a.overallPerformance === 'Needs Attention').length;
  const attendanceValues = classAssessments.map((a) => a.attendancePercentage).filter((v) => v != null);
  const avgAttendance =
    attendanceValues.length > 0 ? Math.round((attendanceValues.reduce((sum, v) => sum + v, 0) / attendanceValues.length) * 10) / 10 : null;

  return {
    roster,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    stats: {
      total: classTotal,
      completed,
      pending,
      needsAttention,
      completionPercent: classTotal > 0 ? Math.round((completed / classTotal) * 100) : 0,
      avgAttendance,
    },
  };
}

// One student's assessment for one month, plus best-effort auto-filled
// context (attendance %, last exam result) a teacher would otherwise have
// to go look up manually. Both auto-fill lookups are wrapped so a school
// with no attendance/exam data yet for this student never breaks the page —
// they just render as null, per the module's own "no records available"
// edge cases.
export async function getAssessmentForStudent(studentId, month, year, currentUser) {
  const schoolId = await resolveSchoolId();
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionId: true,
      class: true,
      section: true,
      academicSession: true,
      photoUrl: true,
      dob: true,
      guardian: true,
      secondaryGuardian: true,
      status: true,
    },
  });
  if (!student) return null;

  // Guardian/secondaryGuardian are each one relationship+fullName blob (see
  // lib/students.js's buildGuardianRecord) — whichever one is "Father" and
  // whichever is "Mother" (in either order, either slot) is what the
  // Assessment Drawer's header card shows. Neither is guaranteed to exist.
  const guardians = [student.guardian, student.secondaryGuardian].filter(Boolean);
  const fatherName = guardians.find((g) => g.relationship === 'Father')?.fullName || '';
  const motherName = guardians.find((g) => g.relationship === 'Mother')?.fullName || '';

  assertClassInScope(currentUser, student.class, student.section, student.academicSession);

  const [existing, attendanceStats, examResults] = await Promise.all([
    prisma.studentAssessment.findUnique({ where: { studentId_month_year: { studentId, month, year } } }),
    getStudentAttendanceStats(studentId, { academicSession: student.academicSession, month: monthKey(month, year) }).catch(() => null),
    getPublishedResultsForStudent(studentId).catch(() => []),
  ]);

  const subjectNames = await getSubjectNames();
  const subjects = subjectNames.length > 0 ? subjectNames : FALLBACK_SUBJECTS;

  // getPublishedResultsForStudent already orders newest-first.
  const latestExam = (examResults || [])[0] || null;

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionId: student.admissionId,
      className: student.class,
      sectionName: student.section,
      academicSession: student.academicSession,
      photoUrl: student.photoUrl || null,
      fatherName,
      motherName,
      transferredOrInactive: student.status !== 'Active',
    },
    subjects,
    autoFill: {
      attendancePercentage: attendanceStats?.percent ?? null,
      lastExamPercent: latestExam?.percentage ?? null,
      classRank: latestExam?.rank ?? null,
    },
    assessment: existing ? decorate(existing) : null,
  };
}

// Upsert — used both for autosave (submit=false, leaves an existing
// COMPLETED row's status untouched so a later edit-and-autosave on an
// already-submitted assessment doesn't silently downgrade it back to Draft)
// and the explicit Submit action (submit=true, always sets COMPLETED).
export async function saveAssessment(studentId, month, year, data, currentUser, { submit = false } = {}) {
  const schoolId = await resolveSchoolId();
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { class: true, section: true, academicSession: true },
  });
  if (!student) throw new Error('Student not found.');

  assertClassInScope(currentUser, student.class, student.section, student.academicSession);

  const existing = await prisma.studentAssessment.findUnique({ where: { studentId_month_year: { studentId, month, year } } });

  const fields = {
    className: student.class,
    sectionName: student.section,
    attendancePercentage: data.attendancePercentage ?? existing?.attendancePercentage ?? null,
    overallPerformance: data.overallPerformance ?? existing?.overallPerformance ?? '',
    overallTags: data.overallTags ?? existing?.overallTags ?? [],
    overallRemark: data.overallRemark ?? existing?.overallRemark ?? '',
    behaviour: data.behaviour ?? existing?.behaviour ?? {},
    academics: data.academics ?? existing?.academics ?? [],
    activities: data.activities ?? existing?.activities ?? {},
    parentCommunication: data.parentCommunication ?? existing?.parentCommunication ?? {},
  };

  const statusFields = submit
    ? { status: 'COMPLETED', submittedByName: currentUser.name, submittedAt: new Date() }
    : existing
    ? {}
    : { status: 'DRAFT' };

  const row = await prisma.studentAssessment.upsert({
    where: { studentId_month_year: { studentId, month, year } },
    update: { ...fields, ...statusFields },
    create: { schoolId, studentId, month, year, ...fields, ...statusFields },
  });

  return decorate(row);
}

// Class Assessment Summary — every field this aggregates across is
// deliberately optional (a Draft an admin hasn't finished, say), so every
// count below only tallies whatever's actually been filled in rather than
// assuming a full row. `perStudent` is the same shape Excel export streams
// as rows — computed once here so the report page and the export route
// never drift out of sync with each other.
// `page`/`pageSize` only slice the `perStudent` table this returns — every
// count (totals/overallCounts/behaviourCounts/academicCounts/activityCounts)
// still covers the WHOLE class, computed from the full student+assessment
// query below, so pagination never changes the charts or stat cards, only
// how many rows of the student table render at once.
export async function getClassAssessmentSummary(currentUser, { className, sectionName, academicSession, month, year, page = 1, pageSize = 20 }) {
  assertClassInScope(currentUser, className, sectionName, academicSession);
  const schoolId = await resolveSchoolId();

  const students = await prisma.student.findMany({
    where: { schoolId, class: className, section: sectionName, academicSession, status: 'Active' },
    select: { id: true, firstName: true, lastName: true, admissionId: true },
    orderBy: { firstName: 'asc' },
  });

  const assessments = await prisma.studentAssessment.findMany({
    where: { schoolId, studentId: { in: students.map((s) => s.id) }, month, year },
  });
  const byStudent = new Map(assessments.map((a) => [a.studentId, a]));

  const overallCounts = Object.fromEntries(OVERALL_PERFORMANCE_OPTIONS.map((o) => [o, 0]));
  const behaviourCounts = Object.fromEntries(RATING_LEVELS.map((r) => [r, 0]));
  const academicCounts = Object.fromEntries(RATING_LEVELS.map((r) => [r, 0]));
  const activityCounts = Object.fromEntries(ACTIVITY_OPTIONS.map((a) => [a, 0]));

  const perStudent = students.map((s) => {
    const a = byStudent.get(s.id);
    if (a) {
      if (overallCounts[a.overallPerformance] !== undefined) overallCounts[a.overallPerformance] += 1;
      BEHAVIOUR_CATEGORIES.forEach((cat) => {
        const rating = a.behaviour?.[cat.key];
        if (behaviourCounts[rating] !== undefined) behaviourCounts[rating] += 1;
      });
      (a.academics || []).forEach((row) => {
        if (academicCounts[row.rating] !== undefined) academicCounts[row.rating] += 1;
      });
      (a.activities?.selectedActivities || []).forEach((activity) => {
        if (activityCounts[activity] !== undefined) activityCounts[activity] += 1;
      });
    }
    return {
      name: `${s.firstName} ${s.lastName}`,
      admissionId: s.admissionId,
      status: a ? (a.status === 'COMPLETED' ? 'Completed' : 'Draft') : 'Not Started',
      overallPerformance: a?.overallPerformance || '',
      parentContacted: a?.parentCommunication?.parentContacted === true ? 'Yes' : a?.parentCommunication?.parentContacted === false ? 'No' : '',
    };
  });

  const completed = perStudent.filter((s) => s.status === 'Completed').length;
  const total = perStudent.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedStudents = perStudent.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return {
    totals: {
      total: students.length,
      completed,
      pending: students.length - completed,
      excellent: overallCounts['Excellent'] || 0,
      good: (overallCounts['Good'] || 0) + (overallCounts['Very Good'] || 0),
      average: overallCounts['Average'] || 0,
      needsAttention: overallCounts['Needs Attention'] || 0,
    },
    overallCounts,
    behaviourCounts,
    academicCounts,
    activityCounts,
    perStudent: pagedStudents,
    page,
    pageSize,
    total,
    totalPages,
  };
}

// "Recently assessed students" — the last few StudentAssessment rows
// touched, any month/year, most-recent-first. A Teacher only ever sees
// their own class scope's rows (fetches a wider window than `limit` since
// the scope filter runs in JS afterward, same tradeoff as everywhere else
// in this app that filters a small already-fetched batch rather than
// building a dynamic OR-per-scope-pair query for it); an Admin sees the
// whole school's.
export async function getRecentlyAssessed(currentUser, limit = 5) {
  const schoolId = await resolveSchoolId();
  const isTeacher = currentUser.role === 'Teacher';
  const scope = isTeacher ? getTeacherClassScope(currentUser) : [];

  const rows = await prisma.studentAssessment.findMany({
    where: { schoolId },
    include: { student: { select: { firstName: true, lastName: true, admissionId: true, academicSession: true } } },
    orderBy: { updatedAt: 'desc' },
    take: isTeacher ? limit * 6 : limit,
  });

  const filtered = isTeacher
    ? rows.filter((r) => isClassInTeacherScope(scope, r.student.academicSession, r.className, r.sectionName))
    : rows;

  return filtered.slice(0, limit).map((r) => ({
    studentId: r.studentId,
    name: `${r.student.firstName} ${r.student.lastName}`,
    className: r.className,
    sectionName: r.sectionName,
    month: r.month,
    year: r.year,
    status: r.status === 'COMPLETED' ? 'Completed' : 'Draft',
    overallPerformance: r.overallPerformance,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
