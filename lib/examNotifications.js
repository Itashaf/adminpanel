import prisma from './db';
import { createNotificationsForStudents } from './parentNotifications';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';
import { createNotificationsForTeachers } from './teacherNotifications';

// Fire-and-forget, same convention as lib/homework.js's
// notifyHomeworkStudents — a notification-persistence/push hiccup must
// never fail the exam action (publish/generate) that triggered it. Shared by
// both callers below since they only differ in which students/copy to use.
async function notifyStudents(schoolId, studentIds, { type, title, message, link, sourceId }) {
  if (!studentIds.length) return;

  await createNotificationsForStudents(schoolId, studentIds, { type, title, message, link, sourceId });

  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: studentIds } },
    select: { parentAccountId: true },
  });
  const parentAccountIds = [...new Set(parentLinks.map((l) => l.parentAccountId))];
  const tokens = await getPushTokensForOwners('Parent', parentAccountIds);
  if (!tokens.length) return;

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } });
  const schoolLabel = school?.displayName || school?.name;
  const messages = tokens.map((token) => ({
    to: token,
    title,
    subtitle: schoolLabel,
    body: message,
    data: { type, sourceId },
  }));
  await sendExpoPushNotifications(messages);
}

// Exam moved to Published — notify every active student in its applicable
// classes+session (same "whole class" scoping as the date sheet itself)
// that the exam/date sheet is now visible to them. Restricted to classes
// that actually HAVE a date sheet — Exam.status is exam-wide (see
// assertCanSetExamStatus), so a Class Teacher publishing can flip this to
// Published for a class whose own subjects nobody's added yet; a parent
// getting "your exam is ready!" with an empty date sheet is worse than
// getting nothing, so that class is silently skipped here (and stays
// invisible to the parent — see getVisibleExams' matching Parent branch)
// until its schedule actually has rows, even though the exam itself is
// already Published.
export async function notifyExamPublished(schoolId, exam) {
  try {
    const scheduleCounts = await prisma.examSchedule.groupBy({
      by: ['className'],
      where: { schoolId, examId: exam.id, className: { in: exam.classes } },
      _count: { id: true },
    });
    const classesWithScheduleRows = scheduleCounts.filter((c) => c._count.id > 0).map((c) => c.className);
    if (!classesWithScheduleRows.length) return;

    const students = await prisma.student.findMany({
      where: { schoolId, academicSession: exam.academicSession, class: { in: classesWithScheduleRows }, status: 'Active' },
      select: { id: true },
    });
    await notifyStudents(schoolId, students.map((s) => s.id), {
      type: 'exam',
      title: `Exam published: ${exam.name}`,
      message: `The date sheet for ${exam.name} is now available.`,
      link: '/parent/exams',
      sourceId: exam.id,
    });
  } catch (err) {
    console.error('notifyExamPublished failed', err);
  }
}

// Result published — one row per exam+student in ExamResult already tells
// us exactly who to notify (only ever the students actually included in this
// publish), no separate class/session lookup needed.
export async function notifyResultsPublished(schoolId, exam, studentIds) {
  try {
    await notifyStudents(schoolId, studentIds, {
      type: 'exam-result',
      title: `Result published: ${exam.name}`,
      message: `Your result for ${exam.name} has been published.`,
      link: '/parent/exams',
      sourceId: exam.id,
    });
  } catch (err) {
    console.error('notifyResultsPublished failed', err);
  }
}

// New exam created — push the Class Teacher of every section in the exam's
// classes (for its own academicSession), so they know to go add their
// class's subjects/date-sheet entries (see lib/examSchedules.js's
// assertCanManageSchedule, which now lets a Class Teacher do exactly that).
// A class with no Class Teacher assigned yet just gets skipped — nothing to
// notify.
export async function notifyClassTeachersExamCreated(schoolId, exam) {
  try {
    const sections = await prisma.section.findMany({
      where: {
        schoolId,
        academicSession: exam.academicSession,
        class: { schoolId, academicSession: exam.academicSession, name: { in: exam.classes } },
        classTeacherId: { not: null },
      },
      select: { classTeacherId: true },
    });
    const teacherIds = [...new Set(sections.map((s) => s.classTeacherId).filter(Boolean))];
    if (!teacherIds.length) return;

    // Persisted independently of push tokens — a Class Teacher who's never
    // opened the mobile app (or denied notification permission) still sees
    // this in their bell/notifications list.
    const title = `New exam: ${exam.name}`;
    const body = `Add your class's subjects and date sheet for ${exam.name}.`;
    await createNotificationsForTeachers(schoolId, teacherIds, {
      type: 'exam-created',
      title,
      message: body,
      link: '/teacher/exams',
      sourceId: exam.id,
    });

    const tokens = await getPushTokensForOwners('Teacher', teacherIds);
    if (!tokens.length) return;

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } });
    const schoolLabel = school?.displayName || school?.name;
    const messages = tokens.map((token) => ({
      to: token,
      title,
      subtitle: schoolLabel,
      body,
      data: { type: 'exam-created', examId: exam.id, link: `/dashboard/exams/${exam.id}` },
    }));
    await sendExpoPushNotifications(messages);
  } catch (err) {
    console.error('notifyClassTeachersExamCreated failed', err);
  }
}

// Marks rejected — notifies whichever teacher(s) actually entered the
// now-rejected marks on this schedule, not just its named subject teacher,
// since a Class Teacher covering a subject with no dedicated teacher could
// be the one who entered them. The rejection reason itself still lives on
// the ExamMark row and is shown in the Teacher's marks-entry screen
// regardless of whether this ever arrives — this is just the heads-up.
export async function notifyTeachersMarksRejected(schoolId, schedule, reason, teacherIds) {
  if (!teacherIds.length) return;
  try {
    const title = `Marks rejected: ${schedule.subject}`;
    const body = `${schedule.className}${schedule.sectionName ? ` — ${schedule.sectionName}` : ''}: ${reason}`;
    await createNotificationsForTeachers(schoolId, teacherIds, {
      type: 'exam-marks-rejected',
      title,
      message: body,
      link: '/teacher/exams',
      sourceId: schedule.id,
    });

    const tokens = await getPushTokensForOwners('Teacher', teacherIds);
    if (!tokens.length) return;

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } });
    const schoolLabel = school?.displayName || school?.name;
    const messages = tokens.map((token) => ({
      to: token,
      title,
      subtitle: schoolLabel,
      body,
      data: { type: 'exam-marks-rejected', examScheduleId: schedule.id },
    }));
    await sendExpoPushNotifications(messages);
  } catch (err) {
    console.error('notifyTeachersMarksRejected failed', err);
  }
}
