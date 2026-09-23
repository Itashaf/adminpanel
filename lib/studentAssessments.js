import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getStudentAttendanceStats } from './attendance';
import { getSubjectNames } from './subjects';
import { getPublishedResultsForStudent } from './examResults';
import { getTeacherClassScope, isClassInTeacherScope } from './roleGuard';
import { FALLBACK_SUBJECTS } from './assessmentConstants';

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
export async function getAssessmentsForClass(currentUser, { className, sectionName, academicSession, month, year }) {
  assertClassInScope(currentUser, className, sectionName, academicSession);
  const schoolId = await resolveSchoolId();

  const students = await prisma.student.findMany({
    where: { schoolId, class: className, section: sectionName, academicSession, status: 'Active' },
    select: { id: true, firstName: true, lastName: true, admissionId: true, photoUrl: true },
    orderBy: { firstName: 'asc' },
  });

  const assessments = await prisma.studentAssessment.findMany({
    where: { schoolId, studentId: { in: students.map((s) => s.id) }, month, year },
  });
  const byStudent = new Map(assessments.map((a) => [a.studentId, a]));

  const roster = students.map((s) => {
    const assessment = byStudent.get(s.id);
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionId: s.admissionId,
      photoUrl: s.photoUrl || null,
      status: assessment ? (assessment.status === 'COMPLETED' ? 'Completed' : 'Draft') : 'Not Started',
      overallPerformance: assessment?.overallPerformance || '',
      updatedAt: assessment ? assessment.updatedAt.toISOString() : null,
    };
  });

  const completed = roster.filter((r) => r.status === 'Completed').length;
  const pending = roster.length - completed;
  const needsAttention = roster.filter((r) => r.overallPerformance === 'Needs Attention').length;

  return {
    roster,
    stats: {
      total: roster.length,
      completed,
      pending,
      needsAttention,
      completionPercent: roster.length > 0 ? Math.round((completed / roster.length) * 100) : 0,
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
    select: { id: true, firstName: true, lastName: true, admissionId: true, class: true, section: true, academicSession: true, photoUrl: true, dob: true, guardian: true, status: true },
  });
  if (!student) return null;

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
      guardianName: student.guardian?.fullName || '',
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
