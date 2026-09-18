import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { assertValidSubjects } from './subjects';
import { logExamAudit } from './examAuditLog';

function decorateSchedule(row) {
  return {
    id: row.id,
    examId: row.examId,
    subject: row.subject,
    className: row.className,
    sectionName: row.sectionName,
    examDate: row.examDate,
    startTime: row.startTime,
    endTime: row.endTime,
    maxMarks: row.maxMarks,
    passingMarks: row.passingMarks,
    examMode: row.examMode,
    room: row.room,
    invigilator: row.invigilator,
    markingType: row.markingType,
    hasPractical: row.hasPractical,
    practicalMaxMarks: row.practicalMaxMarks,
    practicalPassingMarks: row.practicalPassingMarks,
    isOptional: row.isOptional,
    weight: row.weight,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getExamSchedules(examId) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.examSchedule.findMany({
    where: { examId, schoolId },
    orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
  });
  return rows.map(decorateSchedule);
}

// A Teacher only ever sees the date-sheet rows for their own assigned
// class+section+subject, OR every subject of a class+section they're the
// Class Teacher of — that second path is checked independently per schedule
// (not gated behind having any Teacher.assignments entry for the class)
// since a school can make someone a Section's Class Teacher (Classes &
// Sections → "Assign Class Teacher") without also giving them a subject
// assignment there (Teachers → "Assign Class") — those are two separate
// mechanisms, and a Class Teacher must see every subject either way.
export async function getVisibleExamSchedules(examId, currentUser) {
  const all = await getExamSchedules(examId);

  // A Parent only ever sees the date sheet once the exam is actually
  // published — never while it's still Draft — and only their own active
  // child's class (a blank sectionName means "whole class", same "whole
  // class" convention as everywhere else in this file).
  if (currentUser.role === 'Parent') {
    const schoolId = await resolveSchoolId();
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { status: true } });
    if (!exam || exam.status === 'Draft') return [];
    const activeChild = (currentUser.students || []).find((s) => s.id === currentUser.studentId);
    if (!activeChild) return [];
    return all.filter(
      (s) => s.className === activeChild.class && (!s.sectionName || s.sectionName === activeChild.section)
    );
  }

  if (currentUser.role !== 'Teacher') return all;

  const schoolId = await resolveSchoolId();
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { academicSession: true } });
  const results = [];
  for (const schedule of all) {
    // A blank schedule.sectionName means "whole class" — a teacher's own
    // assignment always names one concrete section, never blank, so an
    // exact section match here would wrongly hide every "whole class"
    // schedule from a teacher who IS assigned to that class+subject.
    const isSubjectTeacher = (currentUser.assignedClasses || []).some(
      (a) => a.class === schedule.className && (!schedule.sectionName || a.section === schedule.sectionName) && a.subject === schedule.subject
    );
    if (isSubjectTeacher) {
      results.push(schedule);
      continue;
    }
    const isClassTeacher = await isClassTeacherFor(
      currentUser.teacherId,
      schoolId,
      exam?.academicSession,
      schedule.className,
      schedule.sectionName
    );
    if (isClassTeacher) results.push(schedule);
  }
  return results;
}

// sectionName is accepted but deliberately ignored — a class's exam
// schedule is one shared date sheet regardless of which section a row names
// (or a blank sectionName for "whole class"), so the Class Teacher of ANY
// one section of a class counts as the Class Teacher for every schedule row
// of that class, not just rows naming their own section.
async function isClassTeacherFor(teacherId, schoolId, academicSession, className, _sectionName) {
  if (!teacherId) return false;
  const sections = await prisma.section.findMany({
    where: {
      schoolId,
      academicSession,
      class: { schoolId, academicSession, name: className },
    },
    select: { classTeacherId: true },
  });
  return sections.some((s) => s.classTeacherId === teacherId);
}

// Admin/SuperAdmin can configure any subject's schedule, same as always. A
// Class Teacher can now do the same thing an admin does — add/edit/remove a
// subject's date, time, and marks — but *only* for a class they're the Class
// Teacher of (any one of its sections), never any other class. A Teacher
// with just a subject assignment (not Class Teacher) still can't touch the
// schedule at all — entering marks is their lane, not building the date
// sheet.
async function assertCanManageSchedule(currentUser, schoolId, academicSession, className, sectionName) {
  if (currentUser.role === 'SchoolAdmin' || currentUser.role === 'SuperAdmin') return;
  if (currentUser.role === 'Teacher' && (await isClassTeacherFor(currentUser.teacherId, schoolId, academicSession, className, sectionName))) {
    return;
  }
  throw new Error('Only an admin or that class\'s Class Teacher can configure this subject\'s schedule.');
}

// Which of an exam's classes this Teacher can actually manage the schedule
// for — used by the exam detail page to both gate access (empty array +
// not-admin = they have no business on this exam at all) and to restrict
// the "Add Subject" class picker to just their own class(es), instead of
// every class in the exam.
export async function getClassTeacherScopeForExam(exam, currentUser) {
  if (currentUser.role !== 'Teacher' || !currentUser.teacherId) return [];
  const schoolId = await resolveSchoolId();
  const ownSections = await prisma.section.findMany({
    where: {
      schoolId,
      academicSession: exam.academicSession,
      classTeacherId: currentUser.teacherId,
      class: { schoolId, academicSession: exam.academicSession, name: { in: exam.classes } },
    },
    select: { class: { select: { name: true } } },
  });
  const classNames = [...new Set(ownSections.map((s) => s.class.name))];
  if (!classNames.length) return [];

  // Being Class Teacher of any one section grants access to every section of
  // that class — a class's exam schedule is one shared date sheet regardless
  // of section (see isClassTeacherFor), so scoping this to just the
  // teacher's own section would arbitrarily split what's really one class's
  // worth of subjects between two "owners".
  const allSections = await prisma.section.findMany({
    where: {
      schoolId,
      academicSession: exam.academicSession,
      class: { schoolId, academicSession: exam.academicSession, name: { in: classNames } },
    },
    select: { name: true, class: { select: { name: true } } },
  });
  return allSections.map((s) => ({ className: s.class.name, sectionName: s.name }));
}

const MARKING_TYPES = ['Numeric', 'Grade', 'Remarks'];

function fieldsFrom(data) {
  const markingType = MARKING_TYPES.includes(data.markingType) ? data.markingType : 'Numeric';
  const hasPractical = Boolean(data.hasPractical);
  return {
    subject: data.subject,
    className: data.className,
    sectionName: data.sectionName || '',
    examDate: data.examDate,
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    maxMarks: Number(data.maxMarks),
    passingMarks: Number(data.passingMarks),
    examMode: data.examMode || 'Theory',
    room: data.room || '',
    invigilator: data.invigilator || '',
    markingType,
    hasPractical,
    practicalMaxMarks: hasPractical ? Number(data.practicalMaxMarks) || 0 : 0,
    practicalPassingMarks: hasPractical ? Number(data.practicalPassingMarks) || 0 : 0,
    isOptional: Boolean(data.isOptional),
    weight: data.weight != null && data.weight !== '' ? Number(data.weight) : 1,
  };
}

// Schedule dates must fall within the parent exam's own start/end window —
// a basic sanity check the zod schema (per-field only) can't express since
// it has no access to the parent Exam's dates. Also hands back the exam row
// (academicSession in particular) so callers don't have to fetch it twice.
async function getExamAndAssertWithinWindow(examId, schoolId, examDate) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) throw new Error('Exam not found.');
  if (examDate < exam.startDate || examDate > exam.endDate) {
    throw new Error('Exam date must fall within the exam\'s start and end date.');
  }
  return exam;
}

function assertValidPracticalMarks(data) {
  if (!data.hasPractical) return;
  const max = Number(data.practicalMaxMarks);
  const passing = Number(data.practicalPassingMarks);
  if (!max || max <= 0) throw new Error('Practical maximum marks must be greater than 0.');
  if (passing > max) throw new Error('Practical passing marks cannot exceed practical maximum marks.');
}

export async function addExamSchedule(examId, data, currentUser) {
  const schoolId = await resolveSchoolId();
  const exam = await getExamAndAssertWithinWindow(examId, schoolId, data.examDate);
  // A Class Teacher's schedule is for the whole class, not just their own
  // section — the same date sheet applies whether the Class Teacher of 5-A
  // or 5-B is the one who builds it, so a Teacher-submitted section is
  // always collapsed to blank ("whole class") here, ignoring whatever
  // section the client happened to send. Admins can still target one exact
  // section if they choose to.
  const sectionName = currentUser.role === 'Teacher' ? '' : data.sectionName || '';
  await assertCanManageSchedule(currentUser, schoolId, exam.academicSession, data.className, sectionName);
  await assertValidSubjects(schoolId, data.subject);
  assertValidPracticalMarks(data);

  try {
    const row = await prisma.examSchedule.create({
      data: { schoolId, examId, ...fieldsFrom({ ...data, sectionName }) },
    });
    logExamAudit(schoolId, examId, 'ScheduleUpdated', currentUser, { subject: row.subject, className: row.className });
    return decorateSchedule(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('This subject already has a schedule entry for this class and section.');
    }
    throw err;
  }
}

export async function updateExamSchedule(scheduleId, data, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!existing) return null;
  const exam = await getExamAndAssertWithinWindow(existing.examId, schoolId, data.examDate);
  // A Class Teacher can only edit a row that's already scoped to their own
  // class+section — checked against the row's *existing* class+section, not
  // whatever the submitted data claims, so they can't use an edit to move a
  // schedule into a class they don't own.
  await assertCanManageSchedule(currentUser, schoolId, exam.academicSession, existing.className, existing.sectionName);
  await assertValidSubjects(schoolId, data.subject);
  assertValidPracticalMarks(data);

  try {
    const row = await prisma.examSchedule.update({ where: { id: scheduleId }, data: fieldsFrom(data) });
    logExamAudit(schoolId, existing.examId, 'ScheduleUpdated', currentUser, { subject: row.subject, className: row.className });
    return decorateSchedule(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error('This subject already has a schedule entry for this class and section.');
    }
    throw err;
  }
}

export async function deleteExamSchedule(scheduleId, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!existing) return false;
  const exam = await prisma.exam.findFirst({ where: { id: existing.examId, schoolId }, select: { academicSession: true } });
  await assertCanManageSchedule(currentUser, schoolId, exam?.academicSession, existing.className, existing.sectionName);

  await prisma.examSchedule.delete({ where: { id: scheduleId } });
  return true;
}
