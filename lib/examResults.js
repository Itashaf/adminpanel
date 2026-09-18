import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { DEFAULT_GRADE_SCALE } from './examConstants';
import { logExamAudit } from './examAuditLog';
import { notifyResultsPublished } from './examNotifications';

// Seeds a school's GradeScale on first use rather than at School-creation
// time, so existing schools created before this module get one automatically
// the first time a result is generated, with no separate backfill migration.
async function ensureGradeScale(schoolId) {
  const count = await prisma.gradeScale.count({ where: { schoolId } });
  if (count > 0) return;
  await prisma.gradeScale.createMany({
    data: DEFAULT_GRADE_SCALE.map((g) => ({ schoolId, ...g })),
  });
}

export async function getGradeScale() {
  const schoolId = await resolveSchoolId();
  await ensureGradeScale(schoolId);
  const rows = await prisma.gradeScale.findMany({ where: { schoolId }, orderBy: { minPercent: 'desc' } });
  return rows.map((r) => ({ id: r.id, minPercent: r.minPercent, maxPercent: r.maxPercent, grade: r.grade, isPass: r.isPass }));
}

function gradeFor(percentage, scale) {
  const band = scale.find((g) => percentage >= g.minPercent && percentage <= g.maxPercent);
  return band || { grade: '-', isPass: false };
}

// Rank is computed per exam+class+section group (comparing Class 1 against
// Class 9 would be meaningless), by percentage descending. `tieMode` decides
// how ties resolve: "Skip" is competition ranking (1,1,3 — the tied rank
// consumes the positions it occupies, so the next distinct score's rank
// equals how many students are ranked above it, ties included); "Dense" is
// dense ranking (1,1,2 — every distinct score is exactly one rank below the
// last). Recomputes the WHOLE exam's ranks from what's in the DB right now,
// not just the students this particular generateExamResults call touched —
// a new student's result can shift where an already-generated classmate
// lands.
async function computeAndSaveRanks(examId, schoolId) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { examRankTieMode: true } });
  const tieMode = school?.examRankTieMode === 'Dense' ? 'Dense' : 'Skip';

  const rows = await prisma.examResult.findMany({ where: { examId, schoolId }, select: { id: true, className: true, sectionName: true, percentage: true } });
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.className}::${row.sectionName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const updates = [];
  for (const group of groups.values()) {
    group.sort((a, b) => b.percentage - a.percentage);
    let rank = 0;
    let previousPercentage = null;
    for (let i = 0; i < group.length; i += 1) {
      const row = group[i];
      if (previousPercentage === null || row.percentage !== previousPercentage) {
        rank = tieMode === 'Dense' ? rank + 1 : i + 1;
        previousPercentage = row.percentage;
      }
      updates.push(prisma.examResult.update({ where: { id: row.id }, data: { rank } }));
    }
  }
  if (updates.length > 0) await prisma.$transaction(updates);
}

function decorateResult(row) {
  return {
    id: row.id,
    examId: row.examId,
    studentId: row.studentId,
    totalMarks: row.totalMarks,
    totalMaxMarks: row.totalMaxMarks,
    percentage: row.percentage,
    grade: row.grade,
    isPass: row.isPass,
    status: row.status,
    // Frozen at generation time (see generateExamResults) — every
    // ExamResult row is only ever created there, so this is always set; a
    // student's live Class/Section is never re-joined for these two fields
    // (see getExamResults), which is the whole point of the snapshot.
    className: row.className,
    sectionName: row.sectionName,
    rank: row.rank ?? null,
    publishedAt: row.publishedAt?.toISOString() || null,
  };
}

function assertIsAdmin(currentUser) {
  if (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin') {
    throw new Error('Only an admin can generate or publish results.');
  }
}

// Recomputes every student's ExamResult for this exam from their Approved
// ExamMarks — a student with any subject not yet Approved is skipped (their
// result stays ungenerated) so a partial verification pass can never publish
// an incomplete result. Safe to call repeatedly; each run fully overwrites
// (upserts) rather than incrementally patching.
//
// A student is only ever "complete" against the schedules that actually
// apply to their own class+section (blank ExamSchedule.sectionName means
// "whole class", same convention as everywhere else — see
// lib/examSchedules.js) — not just whichever schedules happen to already
// have a mark row. A subject the teacher never even opened (so no ExamMark
// row exists at all, not even Draft) used to silently drop out of both the
// numerator and denominator, letting a student's percentage/pass-fail be
// computed over a smaller-than-real total. Now any applicable schedule with
// no Approved/Published mark — including "no mark at all" — skips that
// student entirely, same as an explicitly not-yet-approved one already did.
export async function generateExamResults(examId, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const scale = await getGradeScale();

  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) throw new Error('Exam not found.');

  const schedules = await prisma.examSchedule.findMany({ where: { examId, schoolId } });
  const scheduleIds = schedules.map((s) => s.id);
  const marks = await prisma.examMark.findMany({ where: { examScheduleId: { in: scheduleIds } } });

  // Only the optional/elective schedules ever need an enrollment check — a
  // regular (non-optional) schedule applies to every student in its
  // class+section exactly as before.
  const optionalScheduleIds = schedules.filter((s) => s.isOptional).map((s) => s.id);
  const enrollments = optionalScheduleIds.length
    ? await prisma.examOptionalEnrollment.findMany({ where: { examScheduleId: { in: optionalScheduleIds } } })
    : [];
  const enrolledSet = new Set(enrollments.map((e) => `${e.examScheduleId}:${e.studentId}`));
  const isEnrolled = (scheduleId, studentId) => !optionalScheduleIds.includes(scheduleId) || enrolledSet.has(`${scheduleId}:${studentId}`);

  const marksByStudent = new Map();
  for (const mark of marks) {
    if (!marksByStudent.has(mark.studentId)) marksByStudent.set(mark.studentId, []);
    marksByStudent.get(mark.studentId).push(mark);
  }

  const students = await prisma.student.findMany({
    where: { id: { in: [...marksByStudent.keys()] } },
    select: { id: true, class: true, section: true },
  });
  const studentById = new Map(students.map((s) => [s.id, s]));

  const results = [];
  const skipped = [];
  for (const [studentId, studentMarks] of marksByStudent) {
    const student = studentById.get(studentId);
    const applicableSchedules = student
      ? schedules.filter(
          (s) => s.className === student.class && (!s.sectionName || s.sectionName === student.section) && isEnrolled(s.id, studentId)
        )
      : [];
    const marksBySchedule = new Map(studentMarks.map((m) => [m.examScheduleId, m]));
    const allComplete =
      applicableSchedules.length > 0 &&
      applicableSchedules.every((s) => {
        const m = marksBySchedule.get(s.id);
        return m && (m.status === 'Approved' || m.status === 'Published');
      });
    if (!allComplete) {
      skipped.push(studentId);
      continue;
    }

    // Numeric total/max is a weighted sum (weight defaults to 1, so an exam
    // with no custom weights behaves exactly as before) across each
    // schedule's own Numeric marksObtained and/or practical component —
    // Grade/Remarks-only schedules must still be Approved (checked above)
    // but contribute nothing numeric, since there's no percent-equivalent
    // for a letter grade or a remark. "Theory + Practical pass separately"
    // means a schedule with hasPractical needs both its own theory and
    // practical marks to individually clear their own passingMarks.
    let totalMarks = 0;
    let totalMaxMarks = 0;
    let anyAbsent = false;
    let allSubjectsPass = true;
    for (const s of applicableSchedules) {
      const m = marksBySchedule.get(s.id);
      if (m.isAbsent) anyAbsent = true;
      // Max marks are always counted toward the denominator whether the
      // student showed up or not — an absence still costs them that
      // subject's marks (same as the original pre-weight/practical
      // behavior), it just never contributes anything to the numerator.
      if (s.markingType === 'Numeric') {
        const obtained = m.isAbsent ? 0 : m.marksObtained || 0;
        totalMarks += obtained * s.weight;
        totalMaxMarks += s.maxMarks * s.weight;
        if (m.isAbsent || obtained < s.passingMarks) allSubjectsPass = false;
      }
      if (s.hasPractical) {
        const practicalObtained = m.isAbsent ? 0 : m.practicalMarksObtained || 0;
        totalMarks += practicalObtained * s.weight;
        totalMaxMarks += s.practicalMaxMarks * s.weight;
        if (m.isAbsent || practicalObtained < s.practicalPassingMarks) allSubjectsPass = false;
      }
    }
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const band = gradeFor(percentage, scale);
    const isPass = !anyAbsent && band.isPass && allSubjectsPass;

    const snapshot = { className: student.class, sectionName: student.section };
    const row = await prisma.examResult.upsert({
      where: { examId_studentId: { examId, studentId } },
      update: { totalMarks, totalMaxMarks, percentage, grade: band.grade, isPass, status: 'Draft', ...snapshot },
      create: { schoolId, examId, studentId, totalMarks, totalMaxMarks, percentage, grade: band.grade, isPass, status: 'Draft', ...snapshot },
    });
    results.push(row);
  }

  // Rank depends on every student in the same class+section, not just the
  // ones this call happened to touch, so it's computed once here from
  // whatever's now in the DB and re-read back onto the just-generated rows
  // (whose in-memory `rank` is still stale from before this ran).
  await computeAndSaveRanks(examId, schoolId);
  const refreshed = await prisma.examResult.findMany({ where: { id: { in: results.map((r) => r.id) } } });
  const decorated = refreshed.map(decorateResult);

  logExamAudit(schoolId, examId, 'ResultGenerated', currentUser, { generatedCount: decorated.length, skippedCount: skipped.length });

  return { generated: decorated, skippedStudentIds: skipped };
}

export async function getExamResults(examId) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.examResult.findMany({
    where: { examId, schoolId },
    include: { student: { select: { admissionId: true, firstName: true, lastName: true, class: true, section: true } } },
    orderBy: { student: { admissionId: 'asc' } },
  });
  return rows.map((r) => ({
    ...decorateResult(r),
    admissionId: r.student.admissionId,
    studentName: `${r.student.firstName} ${r.student.lastName}`.trim(),
  }));
}

// Every Published result across all exams for one student, newest first —
// the Parent Exam Home screen's "Latest Result" card and its exam list both
// read from this rather than looping getExamResultForStudent per exam.
export async function getPublishedResultsForStudent(studentId) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.examResult.findMany({
    where: { studentId, schoolId, status: 'Published' },
    include: { exam: { select: { name: true, examType: true, academicSession: true } } },
    orderBy: { publishedAt: 'desc' },
  });
  return rows.map((r) => ({
    ...decorateResult(r),
    examName: r.exam.name,
    examType: r.exam.examType,
    academicSession: r.exam.academicSession,
  }));
}

// Reconciles a Re-Test/Improvement/Supplementary exam's own ExamResult with
// its parent exam's, per that exam's own retakeResultPolicy — never rewrites
// either exam's stored ExamResult row, this is purely a read-time view. An
// exam with no parentExamId (the overwhelming majority) just returns its own
// result unchanged, same as getExamResults always did.
export async function getEffectiveExamResult(examId, studentId) {
  const schoolId = await resolveSchoolId();
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) throw new Error('Exam not found.');

  const ownResult = await prisma.examResult.findFirst({ where: { examId, studentId, schoolId } });
  if (!exam.parentExamId) return ownResult ? decorateResult(ownResult) : null;

  const parentResult = await prisma.examResult.findFirst({ where: { examId: exam.parentExamId, studentId, schoolId } });
  if (!ownResult && !parentResult) return null;
  if (!ownResult) return { ...decorateResult(parentResult), sourceExamId: exam.parentExamId };
  if (!parentResult) return { ...decorateResult(ownResult), sourceExamId: examId };

  if (exam.retakeResultPolicy === 'Best') {
    const winner = ownResult.percentage >= parentResult.percentage ? ownResult : parentResult;
    return { ...decorateResult(winner), sourceExamId: winner === ownResult ? examId : exam.parentExamId };
  }

  if (exam.retakeResultPolicy === 'Average') {
    const scale = await getGradeScale();
    const totalMarks = (ownResult.totalMarks + parentResult.totalMarks) / 2;
    const totalMaxMarks = (ownResult.totalMaxMarks + parentResult.totalMaxMarks) / 2;
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const band = gradeFor(percentage, scale);
    return {
      ...decorateResult(ownResult),
      totalMarks,
      totalMaxMarks,
      percentage,
      grade: band.grade,
      isPass: band.isPass,
      sourceExamId: null, // averaged across both — not one single exam's row
    };
  }

  // "Latest" (the default) — the retake's own result wins whenever it exists.
  return { ...decorateResult(ownResult), sourceExamId: examId };
}

// A Parent sees only their active child's result, and only once published —
// a Draft/generated-but-unpublished ExamResult must never leak to a parent.
export async function getExamResultForStudent(examId, studentId) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.examResult.findFirst({
    where: { examId, studentId, schoolId, status: 'Published' },
    include: {
      exam: { select: { name: true, academicSession: true } },
      student: { select: { admissionId: true, firstName: true, lastName: true } },
    },
  });
  if (!row) return null;

  const schedules = await prisma.examSchedule.findMany({ where: { examId, schoolId } });
  const marks = await prisma.examMark.findMany({
    where: { examId, studentId, status: 'Published' },
  });
  const subjectWise = marks.map((m) => {
    const schedule = schedules.find((s) => s.id === m.examScheduleId);
    return {
      subject: schedule?.subject,
      marksObtained: m.marksObtained,
      maxMarks: schedule?.maxMarks,
      isAbsent: m.isAbsent,
    };
  });

  return {
    ...decorateResult(row),
    examName: row.exam.name,
    academicSession: row.exam.academicSession,
    studentName: `${row.student.firstName} ${row.student.lastName}`.trim(),
    admissionId: row.student.admissionId,
    subjectWise,
  };
}

// Publishing a result also flips its underlying ExamMark rows to Published
// (so the parent-facing subject-wise breakdown only ever reads Published
// marks — see getExamResultForStudent) — unpublishing reverses both.
export async function publishExamResults(examId, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();

  const results = await prisma.examResult.findMany({ where: { examId, schoolId, status: 'Draft' } });
  const now = new Date();
  await prisma.examResult.updateMany({
    where: { examId, schoolId, status: 'Draft' },
    data: { status: 'Published', publishedAt: now },
  });
  await prisma.examMark.updateMany({
    where: { examId, schoolId, studentId: { in: results.map((r) => r.studentId) }, status: 'Approved' },
    data: { status: 'Published' },
  });
  const exam = await prisma.exam.update({ where: { id: examId }, data: { status: 'Completed' } });

  logExamAudit(schoolId, examId, 'ResultPublished', currentUser, { studentCount: results.length });
  await notifyResultsPublished(schoolId, exam, results.map((r) => r.studentId));

  return getExamResults(examId);
}

export async function unpublishExamResults(examId, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();

  await prisma.examResult.updateMany({
    where: { examId, schoolId, status: 'Published' },
    data: { status: 'Draft', publishedAt: null },
  });
  await prisma.examMark.updateMany({
    where: { examId, schoolId, status: 'Published' },
    data: { status: 'Approved' },
  });
  logExamAudit(schoolId, examId, 'ResultUnpublished', currentUser);

  return getExamResults(examId);
}
