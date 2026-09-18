import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { EXAM_TYPES } from './examConstants';
import { logExamAudit } from './examAuditLog';
import { notifyExamPublished, notifyClassTeachersExamCreated } from './examNotifications';

const RETAKE_RESULT_POLICIES = ['Best', 'Latest', 'Average'];

function decorateExam(row) {
  return {
    id: row.id,
    name: row.name,
    academicSession: row.academicSession,
    examType: row.examType,
    startDate: row.startDate,
    endDate: row.endDate,
    classes: row.classes || [],
    description: row.description,
    status: row.status,
    parentExamId: row.parentExamId,
    retakeResultPolicy: row.retakeResultPolicy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAllExams() {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.exam.findMany({ where: { schoolId }, orderBy: { startDate: 'desc' } });
  return rows.map(decorateExam);
}

// A Teacher only ever sees exams that include at least one of their own
// assigned classes — a Parent sees only exams that include their active
// child's class (mirrors lib/homework.js's getVisibleHomework). Everyone
// else (Admin) sees every exam in the school.
export async function getVisibleExams(currentUser) {
  const all = await getAllExams();

  if (currentUser.role === 'Teacher') {
    // Two independent ways a Teacher is tied to a class: a subject
    // assignment (currentUser.assignedClasses) and being the Class Teacher
    // of a section (Section.classTeacherId) — a Class Teacher with no
    // subject assignment of their own must still see the exam so they can
    // build its date sheet (see lib/examSchedules.js's assertCanManageSchedule).
    const schoolId = await resolveSchoolId();
    const classTeacherSections = currentUser.teacherId
      ? await prisma.section.findMany({
          where: { schoolId, classTeacherId: currentUser.teacherId },
          select: { academicSession: true, class: { select: { name: true } } },
        })
      : [];
    const myClasses = new Set([
      ...(currentUser.assignedClasses || []).map((a) => a.class),
      ...classTeacherSections.map((s) => s.class.name),
    ]);
    const mySessions = new Set([
      ...(currentUser.assignedClasses || []).map((a) => a.academicSession),
      ...classTeacherSections.map((s) => s.academicSession),
    ]);
    return all.filter((exam) => exam.classes.some((c) => myClasses.has(c)) && mySessions.has(exam.academicSession));
  }

  if (currentUser.role === 'Parent') {
    const activeChild = (currentUser.students || []).find((s) => s.id === currentUser.studentId);
    if (!activeChild) return [];
    // Never a Draft, and never with an empty date sheet — Exam.status is
    // exam-wide (see assertCanSetExamStatus), so a Class Teacher publishing
    // can flip this to Published for a class whose own subjects nobody's
    // added yet. Publishing is a strong signal, but not a guarantee, so a
    // Parent whose child's class has zero schedule rows still sees nothing
    // (same class-scoped check notifyExamPublished uses to decide who to
    // push-notify — this just keeps the in-app list consistent with that).
    const candidates = all.filter(
      (exam) =>
        exam.status !== 'Draft' &&
        exam.classes.includes(activeChild.class) &&
        exam.academicSession === activeChild.academicSession
    );
    if (!candidates.length) return [];

    const schoolId = await resolveSchoolId();
    const scheduleCounts = await prisma.examSchedule.groupBy({
      by: ['examId'],
      where: { schoolId, examId: { in: candidates.map((e) => e.id) }, className: activeChild.class },
      _count: { id: true },
    });
    const examIdsWithSchedules = new Set(scheduleCounts.filter((c) => c._count.id > 0).map((c) => c.examId));
    return candidates.filter((exam) => examIdsWithSchedules.has(exam.id));
  }

  return all;
}

// Embeds `schedules` (the exam's own date sheet) directly on the returned
// object — same "children come attached to the parent" convention as
// lib/classes.js's getClassById embedding `sections`, so the Exam detail
// page (Subjects & Schedule config) needs only this one call.
// EXAM_TYPES is just a starter suggestion list, not a closed set — schools
// commonly use their own short codes (SA1, FA1, PT1, ...), so the Exam Type
// field (Dropdown's `creatable`, see ExamFormModal) lets an admin type any
// value. Once used, that value should keep showing up as a pickable option
// for this school without having to retype it — this merges the presets
// with whatever's actually been used already, deduped case-sensitively.
export async function getExamTypeOptions() {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.exam.findMany({ where: { schoolId }, distinct: ['examType'], select: { examType: true } });
  const used = rows.map((r) => r.examType).filter(Boolean);
  const merged = [...new Set([...EXAM_TYPES, ...used])];
  return merged.map((t) => ({ value: t, label: t }));
}

export async function getExamById(id) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.exam.findFirst({
    where: { id, schoolId },
    include: { schedules: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }] } },
  });
  if (!row) return null;
  return {
    ...decorateExam(row),
    schedules: row.schedules.map((s) => ({
      id: s.id,
      examId: s.examId,
      subject: s.subject,
      className: s.className,
      sectionName: s.sectionName,
      examDate: s.examDate,
      startTime: s.startTime,
      endTime: s.endTime,
      maxMarks: s.maxMarks,
      passingMarks: s.passingMarks,
      examMode: s.examMode,
      room: s.room,
      invigilator: s.invigilator,
    })),
  };
}

function fieldsFrom(data) {
  return {
    name: data.name,
    academicSession: data.academicSession,
    examType: data.examType,
    startDate: data.startDate,
    endDate: data.endDate,
    classes: data.classes || [],
    description: data.description || '',
    // A Re-Test/Improvement/Supplementary exam is just a normal Exam row
    // that additionally names which exam it's retaking (examType stays a
    // free string, same as every other exam — "Re-Exam"/"Improvement Exam"
    // is just whatever the admin types there, not a separate schema
    // concept) — see lib/examResults.js's getEffectiveExamResult for how
    // the two exams' results reconcile once both exist.
    parentExamId: data.parentExamId || null,
    retakeResultPolicy: RETAKE_RESULT_POLICIES.includes(data.retakeResultPolicy) ? data.retakeResultPolicy : 'Latest',
  };
}

// Only an Admin (SchoolAdmin/SuperAdmin) ever creates/edits/deletes/publishes
// an Exam itself — Teachers work only inside an already-published date sheet
// (entering marks via lib/examMarks.js), never the exam shell. Enforced here
// rather than at the route layer so a direct lib call from anywhere still
// can't be bypassed.
function assertIsAdmin(currentUser) {
  if (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin') {
    throw new Error('Only an admin can manage exams.');
  }
}

// Publishing is the one exam-status change a Class Teacher can also make —
// after they've added their own class's subjects to the date sheet, they
// shouldn't have to wait on an admin just to flip Draft -> Published. Any
// other transition (back to Draft, or Completed) stays admin-only, and
// publishing itself still requires being the Class Teacher of at least one
// of the exam's classes — note this affects the WHOLE exam (every class it
// covers), not just that teacher's own section, since Exam.status isn't
// per-class.
async function assertCanSetExamStatus(currentUser, schoolId, exam, status) {
  if (currentUser.role === 'SchoolAdmin' || currentUser.role === 'SuperAdmin') return;
  if (currentUser.role === 'Teacher' && status === 'Published' && currentUser.teacherId) {
    const sections = await prisma.section.findMany({
      where: {
        schoolId,
        academicSession: exam.academicSession,
        classTeacherId: currentUser.teacherId,
        class: { schoolId, academicSession: exam.academicSession, name: { in: exam.classes } },
      },
      select: { id: true },
    });
    if (sections.length > 0) return;
  }
  throw new Error("Only an admin or that exam's Class Teacher can publish it.");
}

export async function createExam(data, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();

  if (data.parentExamId) {
    const parent = await prisma.exam.findFirst({ where: { id: data.parentExamId, schoolId } });
    if (!parent) throw new Error('The exam this is retaking was not found.');
  }

  const row = await prisma.exam.create({
    data: { schoolId, ...fieldsFrom(data), status: 'Draft' },
  });
  logExamAudit(schoolId, row.id, 'ExamCreated', currentUser, { name: row.name });
  notifyClassTeachersExamCreated(schoolId, decorateExam(row));
  return decorateExam(row);
}

export async function updateExam(id, data, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const existing = await prisma.exam.findFirst({ where: { id, schoolId } });
  if (!existing) return null;

  const row = await prisma.exam.update({ where: { id }, data: fieldsFrom(data) });
  return decorateExam(row);
}

export async function deleteExam(id, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const existing = await prisma.exam.findFirst({ where: { id, schoolId } });
  if (!existing) return false;

  await prisma.exam.delete({ where: { id } });
  return true;
}

// Publishing an exam makes its date sheet (ExamSchedule rows) visible to
// Teachers/Parents — it does not touch marks or results, which have their
// own separate publish steps (lib/examMarks.js / lib/examResults.js).
export async function setExamStatus(id, status, currentUser) {
  if (!['Draft', 'Published', 'Completed'].includes(status)) {
    throw new Error('Invalid exam status.');
  }
  const schoolId = await resolveSchoolId();
  const existing = await prisma.exam.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  await assertCanSetExamStatus(currentUser, schoolId, decorateExam(existing), status);

  const row = await prisma.exam.update({ where: { id }, data: { status } });
  logExamAudit(schoolId, id, 'ExamStatusChanged', currentUser, { from: existing.status, to: status });
  if (status === 'Published' && existing.status !== 'Published') {
    await notifyExamPublished(schoolId, decorateExam(row));
  }
  return decorateExam(row);
}

export async function duplicateExam(id, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const existing = await prisma.exam.findFirst({ where: { id, schoolId }, include: { schedules: true } });
  if (!existing) return null;

  const created = await prisma.exam.create({
    data: {
      schoolId,
      name: `${existing.name} (Copy)`,
      academicSession: existing.academicSession,
      examType: existing.examType,
      startDate: existing.startDate,
      endDate: existing.endDate,
      classes: existing.classes,
      description: existing.description,
      status: 'Draft',
      schedules: {
        create: existing.schedules.map((s) => ({
          schoolId,
          subject: s.subject,
          className: s.className,
          sectionName: s.sectionName,
          examDate: s.examDate,
          startTime: s.startTime,
          endTime: s.endTime,
          maxMarks: s.maxMarks,
          passingMarks: s.passingMarks,
          examMode: s.examMode,
          room: s.room,
          invigilator: s.invigilator,
        })),
      },
    },
  });
  return decorateExam(created);
}

// Exam Dashboard summary — total/upcoming/ongoing/completed counts, results
// pending, and marks-entry progress across all schedules. Kept here (rather
// than a separate lib/examDashboard.js) since it's a straightforward
// aggregation over the same Exam/ExamSchedule/ExamMark rows already decorated
// above.
// A schedule's own lifecycle bucket, derived from its ExamMark rows —
// independent of the exam-wide status field, since one exam can have
// subjects at different stages of entry/verification at once.
function classifySchedule(marks) {
  if (marks.length === 0) return 'notStarted';
  if (marks.every((m) => m.status === 'Approved' || m.status === 'Published')) return 'completed';
  if (marks.some((m) => m.status === 'Submitted' || m.status === 'UnderReview')) return 'inProgress';
  return 'pending';
}

export async function getExamDashboardStats() {
  const schoolId = await resolveSchoolId();
  const today = new Date().toISOString().slice(0, 10);

  const [exams, schedules, allMarks, publishedResultExamIds, auditRows, markActivity] = await Promise.all([
    prisma.exam.findMany({ where: { schoolId }, orderBy: { startDate: 'asc' } }),
    prisma.examSchedule.findMany({ where: { schoolId }, select: { id: true, examId: true, subject: true, className: true } }),
    prisma.examMark.findMany({ where: { schoolId }, select: { examScheduleId: true, status: true } }),
    prisma.examResult.findMany({ where: { schoolId, status: 'Published' }, select: { examId: true }, distinct: ['examId'] }),
    prisma.examAuditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, action: true, meta: true, createdAt: true, exam: { select: { name: true } } },
    }),
    prisma.examMark.findMany({
      where: { schoolId, enteredAt: { not: null } },
      orderBy: { enteredAt: 'desc' },
      take: 10,
      select: { id: true, enteredAt: true, exam: { select: { name: true } }, examSchedule: { select: { subject: true, className: true, sectionName: true } } },
    }),
  ]);

  const upcoming = exams.filter((e) => e.startDate > today).length;
  const ongoing = exams.filter((e) => e.startDate <= today && e.endDate >= today).length;
  const completed = exams.filter((e) => e.status === 'Completed' || e.endDate < today).length;
  const resultsPending = exams.filter((e) => e.status !== 'Completed').length;

  const marksBySchedule = new Map();
  for (const m of allMarks) {
    if (!marksBySchedule.has(m.examScheduleId)) marksBySchedule.set(m.examScheduleId, []);
    marksBySchedule.get(m.examScheduleId).push(m);
  }

  const scheduleBuckets = { completed: 0, inProgress: 0, pending: 0, notStarted: 0 };
  const bucketByScheduleId = new Map();
  for (const s of schedules) {
    const bucket = classifySchedule(marksBySchedule.get(s.id) || []);
    scheduleBuckets[bucket] += 1;
    bucketByScheduleId.set(s.id, bucket);
  }

  const schedulesByExam = new Map();
  for (const s of schedules) {
    if (!schedulesByExam.has(s.examId)) schedulesByExam.set(s.examId, []);
    schedulesByExam.get(s.examId).push(bucketByScheduleId.get(s.id));
  }
  const publishedResultExamIdSet = new Set(publishedResultExamIds.map((r) => r.examId));

  const examStatusBreakdown = { draft: 0, published: 0, marksCollection: 0, verification: 0, resultPublished: 0 };
  for (const e of exams) {
    if (e.status === 'Draft') {
      examStatusBreakdown.draft += 1;
      continue;
    }
    if (publishedResultExamIdSet.has(e.id)) {
      examStatusBreakdown.resultPublished += 1;
      continue;
    }
    const buckets = schedulesByExam.get(e.id) || [];
    if (buckets.some((b) => b === 'notStarted' || b === 'pending')) {
      examStatusBreakdown.marksCollection += 1;
    } else if (buckets.some((b) => b === 'inProgress')) {
      examStatusBreakdown.verification += 1;
    } else {
      examStatusBreakdown.published += 1;
    }
  }

  const totalMarks = allMarks.length;
  const enteredMarks = allMarks.filter((m) => m.status !== 'Draft').length;

  const ACTIVITY_META = {
    ExamCreated: (row) => ({ title: 'Exam created', subtitle: row.exam.name }),
    ScheduleUpdated: (row) => ({ title: 'Date sheet updated', subtitle: row.exam.name }),
    ExamStatusChanged: (row) =>
      row.meta?.to === 'Published' ? { title: 'Exam published', subtitle: row.exam.name } : null,
    ResultPublished: (row) => ({ title: 'Results published', subtitle: row.exam.name }),
    ResultUnpublished: (row) => ({ title: 'Results unpublished', subtitle: row.exam.name }),
    MarksRejected: (row) => ({ title: 'Marks rejected', subtitle: row.exam.name }),
  };

  const auditActivity = auditRows
    .map((row) => {
      const build = ACTIVITY_META[row.action];
      const described = build ? build(row) : null;
      if (!described) return null;
      return {
        id: row.id,
        type: row.action,
        title: described.title,
        subtitle: described.subtitle,
        timestamp: row.createdAt.toISOString(),
      };
    })
    .filter(Boolean);

  const entryActivity = markActivity.map((r) => ({
    id: r.id,
    type: 'MarksEntered',
    title: `${r.examSchedule.subject} marks entered for ${r.examSchedule.className}${r.examSchedule.sectionName ? ` • Sec ${r.examSchedule.sectionName}` : ''}`,
    subtitle: r.exam.name,
    timestamp: r.enteredAt?.toISOString(),
  }));

  const recentActivity = [...auditActivity, ...entryActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return {
    totalExams: exams.length,
    upcomingExams: upcoming,
    ongoingExams: ongoing,
    completedExams: completed,
    resultsPending,
    totalScheduleEntries: schedules.length,
    totalMarkEntries: totalMarks,
    enteredMarkEntries: enteredMarks,
    pendingMarkEntries: totalMarks - enteredMarks,
    subjectsProgress: { total: schedules.length, ...scheduleBuckets },
    examStatusBreakdown,
    upcomingExamsList: exams
      .filter((e) => e.status !== 'Completed')
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        name: e.name,
        examType: e.examType,
        classes: e.classes || [],
        startDate: e.startDate,
        status: e.status,
      })),
    recentActivity,
  };
}
