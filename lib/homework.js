import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { isClassInTeacherScope } from './roleGuard';
import { createNotificationsForStudents, deleteNotificationsBySource } from './parentNotifications';
import { getStudentById } from './students';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';
import { assertValidSubjects } from './subjects';

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function decorateHomework(row) {
  return {
    id: row.id,
    academicSession: row.academicSession,
    className: row.className,
    sectionName: row.sectionName,
    subject: row.subject,
    title: row.title,
    description: row.description,
    assignedDate: row.assignedDate,
    assignedByName: row.assignedByName,
    assignedByTeacherId: row.assignedByTeacherId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAllHomework() {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.homework.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } });
  return rows.map(decorateHomework);
}

// A Teacher only ever sees homework for one of their own assigned
// class+section combinations — never another teacher's class, matching the
// same restriction as Attendance and Notices. A Parent sees only their
// active child's homework — same gap lib/notices.js's getVisibleNotices had
// (getHomeworkForStudent already existed for exactly this; nothing called
// it, so every parent saw every class's homework).
export async function getVisibleHomework(currentUser) {
  const all = await getAllHomework();

  if (currentUser.role === 'Teacher') {
    return all.filter((hw) => isClassInTeacherScope(currentUser.assignedClasses, hw.academicSession, hw.className, hw.sectionName));
  }

  if (currentUser.role === 'Parent') {
    const student = await getStudentById(currentUser.studentId, currentUser.schoolId);
    if (!student) return [];
    return getHomeworkForStudent(student);
  }

  return all;
}

// Every homework record a Parent's active child should see — same
// single-element-"assignment" reuse of isClassInTeacherScope as
// lib/notices.js's getNoticesForStudent.
export async function getHomeworkForStudent(student) {
  const all = await getAllHomework();
  return all.filter((hw) =>
    isClassInTeacherScope(
      [{ academicSession: student.academicSession, class: student.class, section: student.section }],
      hw.academicSession,
      hw.className,
      hw.sectionName
    )
  );
}

export function canManageHomework(currentUser, homework) {
  if (currentUser.role !== 'Teacher') return true;
  return homework.assignedByTeacherId === currentUser.teacherId;
}

// A Teacher may assign homework for a class+section only as either its
// Class Teacher (Section.classTeacherId) or the specific subject teacher for
// that exact class+section+subject (Teacher.assignments' own `subject`, set
// per assignment — see AssignClassModal.jsx) — a Hindi teacher assigned only
// to Class 3-A must not be able to assign into Class 1-A just because
// another teacher there also happens to teach Hindi. A teacher's global
// specialization is deliberately not used here: which subject they teach can
// differ from one assigned class to another.
async function isClassTeacherFor(teacherId, schoolId, academicSession, className, sectionName) {
  if (!sectionName) return false;
  const section = await prisma.section.findFirst({
    where: { schoolId, academicSession, name: sectionName, class: { schoolId, academicSession, name: className } },
    select: { classTeacherId: true },
  });
  return section?.classTeacherId === teacherId;
}

// Shared by create/update — a Teacher can only ever assign homework to
// exactly one of their own assigned class+section pairs, and only as that
// section's Class Teacher or the subject's own assigned subject teacher.
async function assertScopeAllowed(data, currentUser, schoolId) {
  if (currentUser.role !== 'Teacher') return;
  if (!isClassInTeacherScope(currentUser.assignedClasses, data.academicSession, data.className, data.sectionName)) {
    throw new Error('You can only assign homework for your own assigned class and section.');
  }

  const isSubjectTeacherHere = (currentUser.assignedClasses || []).some(
    (a) =>
      a.academicSession === data.academicSession &&
      a.class === data.className &&
      a.section === data.sectionName &&
      a.subject === data.subject
  );
  if (isSubjectTeacherHere) return;

  const isClassTeacher = await isClassTeacherFor(
    currentUser.teacherId,
    schoolId,
    data.academicSession,
    data.className,
    data.sectionName
  );
  if (!isClassTeacher) {
    throw new Error(`Only this class's Class Teacher or the ${data.subject} subject teacher for this class can assign this homework.`);
  }
}

function fieldsFrom(data) {
  return {
    academicSession: data.academicSession,
    className: data.className,
    sectionName: data.sectionName || '',
    subject: data.subject,
    title: data.title,
    description: data.description || '',
  };
}

export async function createHomework(data, currentUser) {
  const schoolId = await resolveSchoolId();
  await assertScopeAllowed(data, currentUser, schoolId);
  await assertValidSubjects(schoolId, data.subject);

  const row = await prisma.homework.create({
    data: {
      schoolId,
      ...fieldsFrom(data),
      assignedDate: toLocalDateStr(new Date()),
      assignedByName: currentUser.name,
      assignedByTeacherId: currentUser.role === 'Teacher' ? currentUser.teacherId : null,
    },
  });
  const homework = decorateHomework(row);

  notifyHomeworkStudents(schoolId, homework).catch((err) => console.error('notifyHomeworkStudents failed', err));

  return homework;
}

// Fire-and-forget, same convention as lib/notices.js's notifyNoticeRecipients
// — a notification-persistence hiccup must never fail homework creation.
// Unlike that function, this used to only persist the in-app notification
// and never actually sent a push — a parent only ever saw new homework if
// they happened to open the app and pull the Notifications/Homework list,
// nothing arrived on the lock screen.
async function notifyHomeworkStudents(schoolId, homework) {
  const [students, school] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        academicSession: homework.academicSession,
        class: homework.className,
        section: homework.sectionName,
        status: 'Active',
      },
      select: { id: true },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } }),
  ]);
  const studentIds = students.map((s) => s.id);

  createNotificationsForStudents(schoolId, studentIds, {
    type: 'homework',
    title: `New homework: ${homework.subject}`,
    message: homework.title,
    link: '/parent/homework',
    sourceId: homework.id,
  });

  if (!studentIds.length) return;

  // Same studentId → ParentAccount.id resolution as lib/notices.js's
  // notifyNoticeRecipients — a Parent's push token is keyed by their
  // account, not any one child.
  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: studentIds } },
    select: { parentAccountId: true },
  });
  const parentAccountIds = [...new Set(parentLinks.map((l) => l.parentAccountId))];
  const tokens = await getPushTokensForOwners('Parent', parentAccountIds);
  if (!tokens.length) return;

  const schoolLabel = school?.displayName || school?.name;
  const messages = tokens.map((token) => ({
    to: token,
    title: `New homework: ${homework.subject}`,
    subtitle: schoolLabel,
    body: homework.title,
    data: { type: 'homework', homeworkId: homework.id },
  }));
  await sendExpoPushNotifications(messages);
}

export async function updateHomework(id, data, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.homework.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  if (!canManageHomework(currentUser, existing)) {
    throw new Error('You can only edit homework you assigned.');
  }
  await assertScopeAllowed(data, currentUser, schoolId);
  await assertValidSubjects(schoolId, data.subject);

  const row = await prisma.homework.update({ where: { id }, data: fieldsFrom(data) });
  return decorateHomework(row);
}

export async function deleteHomework(id, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.homework.findFirst({ where: { id, schoolId } });
  if (!existing) return false;
  if (!canManageHomework(currentUser, existing)) {
    throw new Error('You can only delete homework you assigned.');
  }
  await prisma.homework.delete({ where: { id } });
  deleteNotificationsBySource(schoolId, id);
  return true;
}
