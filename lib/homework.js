import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { isClassInTeacherScope, getTeacherClassScope, isAdminTier } from './roleGuard';
import { createNotificationsForStudents, deleteNotificationsBySource } from './parentNotifications';
import { getStudentById } from './students';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';
import { assertValidSubjects } from './subjects';
import { todayInSchoolTz } from './schoolToday';
import { runAfterResponse } from './background';

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
// class+section combinations, OR a class they're the Class Teacher of with
// zero subject assignments of their own (getTeacherClassScope merges both —
// currentUser.assignedClasses alone used to leave a pure Class Teacher
// seeing none of their own homeroom's homework) — never another teacher's
// class, matching the same restriction as Attendance and Notices. A Parent
// sees only their active child's homework — same gap lib/notices.js's
// getVisibleNotices had (getHomeworkForStudent already existed for exactly
// this; nothing called it, so every parent saw every class's homework).
export async function getVisibleHomework(currentUser) {
  const all = await getAllHomework();

  if (currentUser.role === 'Teacher') {
    const scope = getTeacherClassScope(currentUser);
    return all.filter((hw) => isClassInTeacherScope(scope, hw.academicSession, hw.className, hw.sectionName));
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

// The class/section rule shared by every parent-facing homework query: a
// record with no section applies to the whole class, otherwise the section
// must match (same rule as getHomeworkForStudent's isClassInTeacherScope).
function homeworkWhereForStudent(schoolId, student) {
  return {
    schoolId,
    academicSession: student.academicSession,
    className: student.class,
    OR: [{ sectionName: '' }, { sectionName: student.section }],
  };
}

// Parent dashboard's Homework card — just the count and the newest few, so
// the dashboard never loads the whole list.
export async function getHomeworkSummaryForStudent(student, { latest = 3 } = {}) {
  const schoolId = await resolveSchoolId();
  const where = homeworkWhereForStudent(schoolId, student);
  const [count, rows] = await Promise.all([
    prisma.homework.count({ where }),
    prisma.homework.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: latest }),
  ]);
  return { count, latest: rows.map(decorateHomework) };
}

// Server-side paged version of getHomeworkForStudent for the Parent portal's
// Homework table — same class/section rule (a record with no section applies
// to the whole class; otherwise the section must match), but the filtering,
// ordering and skip/take all happen in the database so only one page of rows
// is ever loaded. `subjects` is the child's full distinct subject list (for
// the filter dropdown), independent of the current page/search.
export async function getHomeworkPageForStudent(student, { search = '', subject = '', page = 1, pageSize = 10 } = {}) {
  const schoolId = await resolveSchoolId();
  const trimmedSearch = search.trim();

  const forStudent = homeworkWhereForStudent(schoolId, student);

  const where = {
    ...forStudent,
    ...(subject ? { subject } : {}),
    ...(trimmedSearch
      ? {
          AND: [
            {
              OR: [
                { title: { contains: trimmedSearch, mode: 'insensitive' } },
                { description: { contains: trimmedSearch, mode: 'insensitive' } },
                { subject: { contains: trimmedSearch, mode: 'insensitive' } },
                { assignedByName: { contains: trimmedSearch, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : {}),
  };

  const [rows, total, subjectRows] = await Promise.all([
    prisma.homework.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.homework.count({ where }),
    prisma.homework.findMany({ where: forStudent, select: { subject: true }, distinct: ['subject'], orderBy: { subject: 'asc' } }),
  ]);

  return { rows: rows.map(decorateHomework), total, subjects: subjectRows.map((r) => r.subject) };
}

// getVisibleHomework's Teacher/admin rules as a database filter, for the web
// Homework page's paged query: a Teacher only sees homework inside one of
// their own class+section scopes (a record with no section covers the whole
// class — same rule as isClassInTeacherScope); everyone else (admin tier)
// sees the whole school. Not for a Parent — see homeworkWhereForStudent.
function visibleHomeworkWhere(schoolId, currentUser) {
  if (currentUser.role !== 'Teacher') return { schoolId };
  const scope = getTeacherClassScope(currentUser);
  if (!scope.length) return { schoolId, id: 'never-matches' }; // no assignments at all → nothing, not "unscoped"
  return {
    schoolId,
    OR: scope.map((a) => ({
      academicSession: a.academicSession,
      className: a.class,
      OR: [{ sectionName: '' }, { sectionName: a.section }],
    })),
  };
}

// One page of the web Homework list, filtered/sorted/sliced in the database
// instead of loading every homework record and filtering in the browser.
// `sort`: 'latest' (default, newest first) or 'oldest'.
export async function getHomeworkPageForUser(
  currentUser,
  { className = '', section = '', subject = '', search = '', sort = 'latest', page = 1, pageSize = 10 } = {}
) {
  const schoolId = await resolveSchoolId();
  const query = search.trim();
  const where = {
    AND: [
      visibleHomeworkWhere(schoolId, currentUser),
      ...(className ? [{ className }] : []),
      ...(section ? [{ sectionName: section }] : []),
      ...(subject ? [{ subject }] : []),
      ...(query
        ? [{ OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] }]
        : []),
    ],
  };
  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const [rows, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.homework.count({ where }),
  ]);
  return { rows: rows.map(decorateHomework), total };
}

export function canManageHomework(currentUser, homework) {
  if (currentUser.role !== 'Teacher') return isAdminTier(currentUser);
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
// This first gate must use the MERGED scope (assignments + classTeacherOf),
// not currentUser.assignedClasses alone — a pure Class Teacher with zero
// subject assignments used to be rejected right here, before the
// isClassTeacherFor DB check below ever ran, making them unable to assign
// homework to their own homeroom at all.
async function assertScopeAllowed(data, currentUser, schoolId) {
  if (currentUser.role !== 'Teacher') {
    // Only admin-tier staff may assign homework outside a Teacher's own classes;
    // a Parent or Accountant session must not (it used to fall through here).
    if (!isAdminTier(currentUser)) throw new Error('You do not have permission to manage homework.');
    return;
  }
  if (!isClassInTeacherScope(getTeacherClassScope(currentUser), data.academicSession, data.className, data.sectionName)) {
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
      assignedDate: todayInSchoolTz(),
      assignedByName: currentUser.name,
      assignedByTeacherId: currentUser.role === 'Teacher' ? currentUser.teacherId : null,
    },
  });
  const homework = decorateHomework(row);

  runAfterResponse(notifyHomeworkStudents(schoolId, homework), 'notifyHomeworkStudents failed');

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
