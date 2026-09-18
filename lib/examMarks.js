import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { logExamAudit } from './examAuditLog';
import { notifyTeachersMarksRejected } from './examNotifications';

function decorateMark(row) {
  return {
    id: row.id,
    examId: row.examId,
    examScheduleId: row.examScheduleId,
    studentId: row.studentId,
    marksObtained: row.marksObtained,
    isAbsent: row.isAbsent,
    attendanceStatus: row.attendanceStatus,
    gradeValue: row.gradeValue,
    remarksValue: row.remarksValue,
    practicalMarksObtained: row.practicalMarksObtained,
    status: row.status,
    rejectionReason: row.rejectionReason,
    enteredByTeacherId: row.enteredByTeacherId,
    enteredAt: row.enteredAt?.toISOString() || null,
    verifiedByAdminId: row.verifiedByAdminId,
    verifiedAt: row.verifiedAt?.toISOString() || null,
  };
}

// A Teacher may only enter/view marks for a schedule they're either the
// subject teacher for (exact class+section+subject match) or the Class
// Teacher of — identical rule to lib/homework.js's assertScopeAllowed,
// applied to marks entry instead of homework creation.
async function assertCanAccessSchedule(schedule, currentUser, schoolId) {
  if (currentUser.role !== 'Teacher') return;

  // A schedule with a blank sectionName covers the whole class (every
  // section combined) — a teacher's own assignment always names one
  // concrete section (e.g. "A"), never blank, so requiring an exact
  // section match here would wrongly reject every "whole class" schedule
  // for a teacher who IS assigned to that class+subject in their section.
  const isSubjectTeacher = (currentUser.assignedClasses || []).some(
    (a) => a.class === schedule.className && (!schedule.sectionName || a.section === schedule.sectionName) && a.subject === schedule.subject
  );
  if (isSubjectTeacher) return;

  // A blank schedule.sectionName ("whole class") has no single Section row
  // to look up by name — check every section of the class instead, so the
  // Class Teacher of any one of its sections still qualifies. (A section-
  // specific schedule still narrows this list to just that one section.)
  const exam = await prisma.exam.findFirst({ where: { id: schedule.examId }, select: { academicSession: true } });
  const sections = await prisma.section.findMany({
    where: {
      schoolId,
      academicSession: exam?.academicSession,
      ...(schedule.sectionName ? { name: schedule.sectionName } : {}),
      class: { schoolId, academicSession: exam?.academicSession, name: schedule.className },
    },
    select: { classTeacherId: true },
  });
  if (sections.some((s) => s.classTeacherId === currentUser.teacherId)) return;

  throw new Error('You can only enter marks for a class and subject you are assigned to teach.');
}

// Shared by getMarksSheet and saveExamMarks — every Active student who's
// actually expected to have a mark for this schedule: the whole class+
// section, narrowed to just the enrolled subset when the subject is
// optional/elective (see ExamOptionalEnrollment).
async function getScheduleRoster(schedule, schoolId) {
  const exam = await prisma.exam.findFirst({ where: { id: schedule.examId }, select: { academicSession: true } });

  const [students, enrolledIds] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        academicSession: exam?.academicSession,
        class: schedule.className,
        // A blank sectionName means "whole class" — every section's
        // students, not literally students whose own section is blank
        // (which is none of them), so the filter is omitted entirely here.
        ...(schedule.sectionName ? { section: schedule.sectionName } : {}),
        status: 'Active',
      },
      orderBy: { admissionId: 'asc' },
      select: { id: true, admissionId: true, firstName: true, lastName: true },
    }),
    schedule.isOptional ? prisma.examOptionalEnrollment.findMany({ where: { examScheduleId: schedule.id }, select: { studentId: true } }) : null,
  ]);

  const enrolledSet = enrolledIds ? new Set(enrolledIds.map((e) => e.studentId)) : null;
  return enrolledSet ? students.filter((s) => enrolledSet.has(s.id)) : students;
}

// The full student roster for a schedule's class+section, each already
// joined with any existing ExamMark row for this schedule — this is the
// exact shape the Teacher marks-entry screen (Phase 3) renders one row per.
export async function getMarksSheet(scheduleId, currentUser) {
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  await assertCanAccessSchedule(schedule, currentUser, schoolId);

  const [roster, marks] = await Promise.all([
    getScheduleRoster(schedule, schoolId),
    prisma.examMark.findMany({ where: { examScheduleId: scheduleId } }),
  ]);

  const marksByStudentId = new Map(marks.map((m) => [m.studentId, m]));

  return {
    schedule: {
      id: schedule.id,
      examId: schedule.examId,
      subject: schedule.subject,
      className: schedule.className,
      sectionName: schedule.sectionName,
      maxMarks: schedule.maxMarks,
      passingMarks: schedule.passingMarks,
      markingType: schedule.markingType,
      hasPractical: schedule.hasPractical,
      practicalMaxMarks: schedule.practicalMaxMarks,
      practicalPassingMarks: schedule.practicalPassingMarks,
      isOptional: schedule.isOptional,
    },
    students: roster.map((s) => {
      const mark = marksByStudentId.get(s.id);
      return {
        studentId: s.id,
        admissionId: s.admissionId,
        name: `${s.firstName} ${s.lastName}`.trim(),
        marksObtained: mark?.marksObtained ?? null,
        isAbsent: mark?.isAbsent ?? false,
        attendanceStatus: mark?.attendanceStatus ?? 'Present',
        gradeValue: mark?.gradeValue ?? '',
        remarksValue: mark?.remarksValue ?? '',
        practicalMarksObtained: mark?.practicalMarksObtained ?? null,
        status: mark?.status ?? 'Draft',
        rejectionReason: mark?.status === 'UnderReview' ? mark?.rejectionReason || '' : '',
      };
    }),
  };
}

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Medical', 'Exempted', 'ReExam'];

// Normalizes one incoming row to a real attendanceStatus — accepts either
// the new `attendanceStatus` field directly, or the old plain `isAbsent`
// boolean from before Medical/Exempted/ReExam existed (true → "Absent",
// false → "Present"), so an older client sending only `isAbsent` still
// works exactly as before.
function resolveAttendanceStatus(row) {
  if (ATTENDANCE_STATUSES.includes(row.attendanceStatus)) return row.attendanceStatus;
  return row.isAbsent ? 'Absent' : 'Present';
}

// Upserts one ExamMark row per entry — used by both "Save Draft" and
// "Submit Marks" (submit=true additionally flips every touched row's status
// to Submitted, locking further edits from this same call path once
// Approved — see submitMarksForVerification). What's actually stored beyond
// attendanceStatus depends on the schedule: marksObtained for "Numeric"
// markingType, gradeValue for "Grade", remarksValue for "Remarks", plus
// practicalMarksObtained whenever hasPractical — any of these left null
// whenever the student isn't Present, same as marksObtained always was.
export async function saveExamMarks(scheduleId, rows, currentUser, { submit = false } = {}) {
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  await assertCanAccessSchedule(schedule, currentUser, schoolId);

  for (const row of rows) {
    const attendanceStatus = resolveAttendanceStatus(row);
    if (attendanceStatus !== 'Present') continue;
    if (schedule.markingType === 'Numeric' && row.marksObtained != null) {
      if (row.marksObtained < 0) throw new Error('Marks cannot be negative.');
      if (row.marksObtained > schedule.maxMarks) throw new Error(`Marks cannot exceed the maximum of ${schedule.maxMarks}.`);
    }
    if (schedule.hasPractical && row.practicalMarksObtained != null) {
      if (row.practicalMarksObtained < 0) throw new Error('Practical marks cannot be negative.');
      if (row.practicalMarksObtained > schedule.practicalMaxMarks) {
        throw new Error(`Practical marks cannot exceed the maximum of ${schedule.practicalMaxMarks}.`);
      }
    }
  }

  // "Submit" (as opposed to "Save Draft") means done — every student in the
  // roster must have a determinate entry first, not just whichever ones the
  // teacher got to. A Draft save never enforces this (that's the whole point
  // of a draft), and an admin's own correction pass is never blocked by it
  // either (assertIsAdmin-gated actions, not this one).
  if (submit) {
    const roster = await getScheduleRoster(schedule, schoolId);
    const rowsByStudentId = new Map(rows.map((r) => [r.studentId, r]));
    const incomplete = [];
    for (const student of roster) {
      const row = rowsByStudentId.get(student.id);
      if (!row) {
        incomplete.push(student);
        continue;
      }
      const attendanceStatus = resolveAttendanceStatus(row);
      if (attendanceStatus !== 'Present') continue; // Absent/Medical/Exempted/ReExam never need a mark value.
      const hasPrimaryValue =
        (schedule.markingType === 'Numeric' && row.marksObtained != null) ||
        (schedule.markingType === 'Grade' && !!row.gradeValue) ||
        (schedule.markingType === 'Remarks' && !!row.remarksValue);
      const hasPracticalValue = !schedule.hasPractical || row.practicalMarksObtained != null;
      if (!hasPrimaryValue || !hasPracticalValue) incomplete.push(student);
    }
    if (incomplete.length > 0) {
      const names = incomplete
        .slice(0, 3)
        .map((s) => `${s.firstName} ${s.lastName}`.trim())
        .join(', ');
      const more = incomplete.length > 3 ? ` and ${incomplete.length - 3} more` : '';
      throw new Error(`Enter marks (or mark Absent) for every student before submitting — missing: ${names}${more}.`);
    }
  }

  // A Teacher is locked out the moment their own entry has left Draft — once
  // Submitted, they need an admin to explicitly unlock it (see unlockMarks)
  // before touching it again, all the way through Approved/Published. An
  // admin/super admin bypasses this entirely: they can correct marks at any
  // stage — before verification, before publish, even after — since the
  // whole point of the verification workflow is to gate a *teacher's* edits,
  // not the admin's.
  const existing = await prisma.examMark.findMany({ where: { examScheduleId: scheduleId } });
  const isAdmin = currentUser.role === 'SchoolAdmin' || currentUser.role === 'SuperAdmin';
  const lockedStudentIds = isAdmin
    ? new Set()
    : new Set(existing.filter((m) => ['Submitted', 'Approved', 'Published'].includes(m.status)).map((m) => m.studentId));

  const now = new Date();
  const results = [];
  for (const row of rows) {
    if (lockedStudentIds.has(row.studentId)) {
      throw new Error('Marks already submitted cannot be edited unless an admin unlocks them.');
    }
    const attendanceStatus = resolveAttendanceStatus(row);
    const isPresent = attendanceStatus === 'Present';
    const data = {
      marksObtained: isPresent && schedule.markingType === 'Numeric' ? row.marksObtained ?? null : null,
      gradeValue: isPresent && schedule.markingType === 'Grade' ? row.gradeValue || '' : '',
      remarksValue: isPresent && schedule.markingType === 'Remarks' ? row.remarksValue || '' : '',
      practicalMarksObtained: isPresent && schedule.hasPractical ? row.practicalMarksObtained ?? null : null,
      isAbsent: !isPresent,
      attendanceStatus,
      status: submit ? 'Submitted' : 'Draft',
      enteredByTeacherId: currentUser.role === 'Teacher' ? currentUser.teacherId : null,
      enteredAt: now,
    };
    const saved = await prisma.examMark.upsert({
      where: { examScheduleId_studentId: { examScheduleId: scheduleId, studentId: row.studentId } },
      update: data,
      create: { schoolId, examId: schedule.examId, examScheduleId: scheduleId, studentId: row.studentId, ...data },
    });
    results.push(decorateMark(saved));
  }
  return results;
}

// Admin-facing verification queue: every ExamMark for an exam+class+section+
// subject combination, whatever their current status.
export async function getMarksForVerification(examId, className, sectionName, subject) {
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({
    where: { schoolId, examId, className, sectionName: sectionName || '', subject },
  });
  if (!schedule) return { schedule: null, marks: [] };

  const marks = await prisma.examMark.findMany({
    where: { examScheduleId: schedule.id },
    include: { student: { select: { admissionId: true, firstName: true, lastName: true } } },
    orderBy: { student: { admissionId: 'asc' } },
  });

  return {
    schedule: {
      id: schedule.id,
      maxMarks: schedule.maxMarks,
      passingMarks: schedule.passingMarks,
      markingType: schedule.markingType,
      hasPractical: schedule.hasPractical,
      practicalMaxMarks: schedule.practicalMaxMarks,
      practicalPassingMarks: schedule.practicalPassingMarks,
    },
    marks: marks.map((m) => ({
      ...decorateMark(m),
      admissionId: m.student.admissionId,
      studentName: `${m.student.firstName} ${m.student.lastName}`.trim(),
    })),
  };
}

function assertIsAdmin(currentUser) {
  if (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin') {
    throw new Error('Only an admin can verify marks.');
  }
}

// Approve moves every Submitted/UnderReview mark for this schedule to
// Approved and locks it (see saveExamMarks's lockedStudentIds check) —
// Reject sends it back to the teacher with a reason, status UnderReview so
// it's visibly distinct from a never-submitted Draft row. `studentId`
// narrows any of these three actions to just one row instead of the whole
// class+section+subject — the per-row "..." menu in the Verify Marks UI.
export async function approveMarks(scheduleId, currentUser, studentId = null) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  const now = new Date();
  await prisma.examMark.updateMany({
    where: { examScheduleId: scheduleId, status: { in: ['Submitted', 'UnderReview'] }, ...(studentId ? { studentId } : {}) },
    data: { status: 'Approved', verifiedByAdminId: currentUser.id, verifiedAt: now, rejectionReason: '' },
  });
  logExamAudit(schoolId, schedule.examId, 'MarksApproved', currentUser, {
    className: schedule.className,
    sectionName: schedule.sectionName,
    subject: schedule.subject,
    studentId: studentId || undefined,
  });
  return getMarksForVerification(schedule.examId, schedule.className, schedule.sectionName, schedule.subject);
}

export async function rejectMarks(scheduleId, reason, currentUser, studentId = null) {
  assertIsAdmin(currentUser);
  if (!reason?.trim()) throw new Error('A rejection reason is required.');
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  const now = new Date();
  const affected = await prisma.examMark.findMany({
    where: { examScheduleId: scheduleId, status: { in: ['Submitted', 'UnderReview'] }, ...(studentId ? { studentId } : {}) },
    select: { enteredByTeacherId: true },
  });
  await prisma.examMark.updateMany({
    where: { examScheduleId: scheduleId, status: { in: ['Submitted', 'UnderReview'] }, ...(studentId ? { studentId } : {}) },
    data: { status: 'UnderReview', verifiedByAdminId: currentUser.id, verifiedAt: now, rejectionReason: reason.trim() },
  });
  logExamAudit(schoolId, schedule.examId, 'MarksRejected', currentUser, {
    className: schedule.className,
    sectionName: schedule.sectionName,
    subject: schedule.subject,
    reason: reason.trim(),
    studentId: studentId || undefined,
  });
  const teacherIds = [...new Set(affected.map((m) => m.enteredByTeacherId).filter(Boolean))];
  notifyTeachersMarksRejected(schoolId, schedule, reason.trim(), teacherIds);
  return getMarksForVerification(schedule.examId, schedule.className, schedule.sectionName, schedule.subject);
}

// The only way a Teacher gets edit access back once locked out (see
// saveExamMarks) — an explicit admin permission grant, not something a
// Teacher can do themselves. Approved reverts to UnderReview (distinct from
// a never-reviewed row, since it already went through verification once);
// a plain Submitted (never reviewed yet) reverts all the way to Draft.
export async function unlockMarks(scheduleId, currentUser, studentId = null) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  await prisma.examMark.updateMany({
    where: { examScheduleId: scheduleId, status: 'Approved', ...(studentId ? { studentId } : {}) },
    data: { status: 'UnderReview' },
  });
  await prisma.examMark.updateMany({
    where: { examScheduleId: scheduleId, status: 'Submitted', ...(studentId ? { studentId } : {}) },
    data: { status: 'Draft' },
  });
  logExamAudit(schoolId, schedule.examId, 'MarksUnlocked', currentUser, {
    className: schedule.className,
    sectionName: schedule.sectionName,
    subject: schedule.subject,
    studentId: studentId || undefined,
  });
  return getMarksForVerification(schedule.examId, schedule.className, schedule.sectionName, schedule.subject);
}

// School-wide "marks still owed" alerts for the Smart Alerts widget — one
// entry per class that has at least one schedule, belonging to a Published
// exam whose own end date has already passed, with marks not yet fully
// entered. Only looks at exams that have actually ended (an exam still in
// progress isn't "pending", it just isn't due yet).
export async function getPendingMarksAlerts() {
  const schoolId = await resolveSchoolId();
  const today = new Date().toISOString().slice(0, 10);
  const endedExams = await prisma.exam.findMany({
    where: { schoolId, status: 'Published', endDate: { lt: today } },
    select: { id: true, academicSession: true, schedules: true },
  });

  const pendingByClass = new Map();
  for (const exam of endedExams) {
    for (const schedule of exam.schedules) {
      const [classStudentCount, enteredCount, enrolledCount] = await Promise.all([
        prisma.student.count({
          where: {
            schoolId,
            academicSession: exam.academicSession,
            class: schedule.className,
            ...(schedule.sectionName ? { section: schedule.sectionName } : {}),
            status: 'Active',
          },
        }),
        prisma.examMark.count({
          where: {
            examScheduleId: schedule.id,
            OR: [{ marksObtained: { not: null } }, { gradeValue: { not: null } }, { isAbsent: true }],
          },
        }),
        schedule.isOptional ? prisma.examOptionalEnrollment.count({ where: { examScheduleId: schedule.id } }) : null,
      ]);
      const totalStudents = schedule.isOptional ? enrolledCount : classStudentCount;
      if (totalStudents > 0 && enteredCount < totalStudents) {
        pendingByClass.set(schedule.className, (pendingByClass.get(schedule.className) || 0) + 1);
      }
    }
  }

  return [...pendingByClass.entries()].map(([className, pendingSubjects]) => ({ className, pendingSubjects }));
}

// Marks-entry progress for the Admin dashboard/verification screen — one row
// per ExamSchedule with total/entered/pending/absent counts.
export async function getMarksEntryProgress(examId) {
  const schoolId = await resolveSchoolId();
  const [schedules, exam] = await Promise.all([
    prisma.examSchedule.findMany({ where: { schoolId, examId } }),
    prisma.exam.findFirst({ where: { id: examId }, select: { academicSession: true } }),
  ]);

  const progress = [];
  for (const schedule of schedules) {
    const [classStudentCount, marks, enrolledCount] = await Promise.all([
      prisma.student.count({
        where: {
          schoolId,
          academicSession: exam?.academicSession,
          class: schedule.className,
          ...(schedule.sectionName ? { section: schedule.sectionName } : {}),
          status: 'Active',
        },
      }),
      prisma.examMark.findMany({ where: { examScheduleId: schedule.id } }),
      schedule.isOptional ? prisma.examOptionalEnrollment.count({ where: { examScheduleId: schedule.id } }) : null,
    ]);
    // An optional/elective schedule's roster is only the enrolled students,
    // not the whole class — otherwise every student who never takes this
    // subject would count as permanently "pending".
    const totalStudents = schedule.isOptional ? enrolledCount : classStudentCount;

    const entered = marks.filter(
      (m) => m.marksObtained != null || m.gradeValue || m.remarksValue || m.practicalMarksObtained != null || m.isAbsent
    ).length;
    const absent = marks.filter((m) => m.isAbsent).length;

    progress.push({
      scheduleId: schedule.id,
      subject: schedule.subject,
      className: schedule.className,
      sectionName: schedule.sectionName,
      totalStudents,
      entered,
      pending: totalStudents - entered,
      absent,
    });
  }
  return progress;
}

// How many of an exam's schedules are fully Approved (every mark on that
// schedule is Approved or Published) vs still have something Submitted/
// UnderReview waiting on the admin — feeds the Exam Detail page's step
// checklist (ExamChecklist.jsx), which needs a single "is verification done
// yet" signal without the caller having to loop getMarksForVerification
// itself per schedule.
export async function getExamVerificationSummary(examId) {
  const schoolId = await resolveSchoolId();
  const schedules = await prisma.examSchedule.findMany({ where: { schoolId, examId }, select: { id: true } });
  const scheduleIds = schedules.map((s) => s.id);
  if (scheduleIds.length === 0) {
    return { totalSchedules: 0, approvedSchedules: 0, pendingReviewSchedules: 0 };
  }

  const marks = await prisma.examMark.findMany({
    where: { examScheduleId: { in: scheduleIds } },
    select: { examScheduleId: true, status: true },
  });

  const statusesBySchedule = new Map();
  for (const mark of marks) {
    if (!statusesBySchedule.has(mark.examScheduleId)) statusesBySchedule.set(mark.examScheduleId, new Set());
    statusesBySchedule.get(mark.examScheduleId).add(mark.status);
  }

  let approvedSchedules = 0;
  let pendingReviewSchedules = 0;
  for (const id of scheduleIds) {
    const statuses = statusesBySchedule.get(id) || new Set();
    if (statuses.size > 0 && [...statuses].every((s) => s === 'Approved' || s === 'Published')) approvedSchedules++;
    if (statuses.has('Submitted') || statuses.has('UnderReview')) pendingReviewSchedules++;
  }

  return { totalSchedules: scheduleIds.length, approvedSchedules, pendingReviewSchedules };
}
