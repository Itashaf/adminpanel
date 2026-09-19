import { unstable_cache, revalidateTag } from 'next/cache';
import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { isClassInTeacherScope } from './roleGuard';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';
import { deleteObject, keyFromPublicUrl } from './storage';
import { createNotificationsForStudents, deleteNotificationsBySource as deleteParentNotificationsBySource } from './parentNotifications';
import {
  createNotificationsForTeachers,
  deleteNotificationsBySource as deleteTeacherNotificationsBySource,
} from './teacherNotifications';
import { getStudentById } from './students';

// Client-safe constants (NOTICE_AUDIENCES/NOTICE_PRIORITIES) live in
// lib/noticeConstants.js, not here — this file now pulls in Prisma +
// resolveSchoolId's next/headers dependency (see lib/schoolSettings.js for
// the same split and the build error that split fixes), so it must never be
// reachable from a Client Component. NoticeFormModal.jsx/NoticesFiltersBar.jsx
// import the constants from lib/noticeConstants.js directly.

function decorateNotice(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience,
    academicSession: row.academicSession,
    className: row.className,
    sectionName: row.sectionName,
    priority: row.priority,
    expiryDate: row.expiryDate,
    postedByName: row.postedByName,
    postedByRole: row.postedByRole,
    postedByTeacherId: row.postedByTeacherId,
    attachmentUrl: row.attachmentUrl,
    attachmentName: row.attachmentName,
    attachmentSize: row.attachmentSize,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

// Read-heavy (every Notices tab open, teacher/parent, every focus) against
// data that changes rarely (an admin/teacher posting a notice). Cached for
// 30s — the same staleness window the mobile client's own RTK Query cache
// already tolerates (baseApi.js's refetchOnMountOrArgChange) — so a cache
// hit isn't a new correctness concession, just skips a cold DB round-trip
// other concurrent requests would've paid for the same data. `schoolId`
// must be resolved OUTSIDE this cached function: Next.js's unstable_cache
// disallows dynamic APIs (cookies/headers, which resolveSchoolId reads)
// inside a cached function's body.
const getNoticesFromDb = unstable_cache(
  async (schoolId) => {
    const rows = await prisma.notice.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } });
    return rows.map(decorateNotice);
  },
  ['notices'],
  { revalidate: 30, tags: ['notices'] }
);

export async function getAllNotices() {
  const schoolId = await resolveSchoolId();
  return getNoticesFromDb(schoolId);
}

// Notices a given user should actually see: everyone sees "Whole School"
// notices; a Teacher additionally sees "Class" notices targeted at one of
// their own assigned class+section combinations (or the whole class, i.e.
// no specific section set) — never another teacher's class; a Parent sees
// "Class" notices only for their own active child's class+section — never
// another family's class (this used to fall through to `all`, showing every
// class's notices to every parent — getNoticesForStudent already existed
// for exactly this but nothing called it).
export async function getVisibleNotices(currentUser) {
  const all = await getAllNotices();

  if (currentUser.role === 'Teacher') {
    return all.filter((notice) => {
      if (notice.audience === 'Whole School') return true;
      return isClassInTeacherScope(currentUser.assignedClasses, notice.academicSession, notice.className, notice.sectionName);
    });
  }

  if (currentUser.role === 'Parent') {
    const student = await getStudentById(currentUser.studentId, currentUser.schoolId);
    if (!student) return all.filter((notice) => notice.audience === 'Whole School');
    return getNoticesForStudent(student);
  }

  return all;
}

// Paginated view of getVisibleNotices for the mobile app — a school
// accumulates notices for its whole lifetime, and the mobile client used to
// download every single one on every open. The visibility rule itself still
// runs in full first (it's a small in-memory filter over one school's
// notices, not a DB-level cost) — this only slices the ALREADY-correct
// result, so it can't accidentally show something outside a Teacher/Parent's
// own scope just because it fell on a different "page" of the raw query.
export async function getVisibleNoticesPage(currentUser, { page = 1, pageSize = 10 } = {}) {
  const all = await getVisibleNotices(currentUser);
  const start = (page - 1) * pageSize;
  const notices = all.slice(start, start + pageSize);
  return { notices, hasMore: all.length > start + pageSize, total: all.length };
}

// Every notice a Parent's active child should see for the Parent Portal —
// same rule as getVisibleNotices' Teacher branch (whole-school + their own
// class/section), just checked against one student's class/section instead
// of a Teacher's assignedClasses array. isClassInTeacherScope only ever
// calls `.some()` over whatever array it's given, so wrapping the student
// into a single-element "assignment" reuses it as-is.
export async function getNoticesForStudent(student) {
  const all = await getAllNotices();
  return all.filter((notice) => {
    if (notice.audience === 'Whole School') return true;
    return isClassInTeacherScope(
      [{ academicSession: student.academicSession, class: student.class, section: student.section }],
      notice.academicSession,
      notice.className,
      notice.sectionName
    );
  });
}

// A single notice by id, respecting the same visibility rule as
// getVisibleNotices — a Teacher gets null (treated as 404 by the route) for
// a notice outside their own scope, same as if it didn't exist.
export async function getNoticeById(id, currentUser) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.notice.findFirst({ where: { id, schoolId } });
  if (!row) return null;
  const notice = decorateNotice(row);
  if (notice.audience === 'Whole School') return notice;

  if (currentUser.role === 'Teacher') {
    const inScope = isClassInTeacherScope(
      currentUser.assignedClasses,
      notice.academicSession,
      notice.className,
      notice.sectionName
    );
    return inScope ? notice : null;
  }

  if (currentUser.role === 'Parent') {
    const student = await getStudentById(currentUser.studentId, currentUser.schoolId);
    if (!student) return null;
    const inScope = isClassInTeacherScope(
      [{ academicSession: student.academicSession, class: student.class, section: student.section }],
      notice.academicSession,
      notice.className,
      notice.sectionName
    );
    return inScope ? notice : null;
  }

  return notice;
}

// Notices are read-only for a Teacher — they see whole-school notices and
// notices for their own classes, but only a SchoolAdmin can post/edit/delete
// (unlike Homework, which a Teacher does manage).
export function canManageNotice(currentUser) {
  return currentUser.role !== 'Teacher';
}

function assertScopeAllowed(data, currentUser) {
  if (data.audience === 'Class' && !data.className) {
    throw new Error('Select a class for a class-specific notice.');
  }
  if (currentUser.role === 'Teacher') {
    throw new Error('Notices are managed by school admins. Teachers have read-only access.');
  }
}

function fieldsFrom(data) {
  return {
    title: data.title,
    message: data.message,
    audience: data.audience,
    academicSession: data.audience === 'Class' ? data.academicSession || '' : '',
    className: data.audience === 'Class' ? data.className : '',
    sectionName: data.audience === 'Class' ? data.sectionName || '' : '',
    priority: data.priority || 'Normal',
    expiryDate: data.expiryDate || '',
    attachmentUrl: data.attachmentUrl || null,
    attachmentName: data.attachmentName || null,
    attachmentSize: data.attachmentSize || null,
  };
}

// Who to push-notify for a given notice: a "Whole School" notice reaches
// every Teacher and every Parent (Student) in the school; a "Class" notice
// only reaches the Teachers assigned to that exact academicSession+class(+
// section) — same isClassInTeacherScope check getVisibleNotices uses, just
// run against every teacher's assignments instead of filtering notices —
// and the Parents of students in that class (all sections, if the notice
// left section unset, same as the admin's "All Sections" option).
async function resolveNoticeRecipients(schoolId, notice) {
  if (notice.audience === 'Whole School') {
    const [teachers, students] = await Promise.all([
      prisma.teacher.findMany({ where: { schoolId }, select: { id: true } }),
      prisma.student.findMany({ where: { schoolId }, select: { id: true } }),
    ]);
    return { teacherIds: teachers.map((t) => t.id), studentIds: students.map((s) => s.id) };
  }

  const [teachers, students] = await Promise.all([
    prisma.teacher.findMany({ where: { schoolId }, select: { id: true, assignments: true } }),
    prisma.student.findMany({
      where: {
        schoolId,
        academicSession: notice.academicSession,
        class: notice.className,
        ...(notice.sectionName ? { section: notice.sectionName } : {}),
      },
      select: { id: true },
    }),
  ]);

  const teacherIds = teachers
    .filter((t) =>
      isClassInTeacherScope(
        (t.assignments || []).filter((a) => a.status === 'Active'),
        notice.academicSession,
        notice.className,
        notice.sectionName
      )
    )
    .map((t) => t.id);

  return { teacherIds, studentIds: students.map((s) => s.id) };
}

// Fire-and-forget — a push-delivery failure must never turn into a failed
// notice creation (see lib/expoPush.js, which never throws), so this isn't
// awaited by its caller.
async function notifyNoticeRecipients(schoolId, notice) {
  try {
    const [{ teacherIds, studentIds }, school] = await Promise.all([
      resolveNoticeRecipients(schoolId, notice),
      prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } }),
    ]);

    // A Parent's push token is registered against their ParentAccount.id
    // (see app/api/notifications/register-token/route.js — ownerId is
    // whatever getCurrentUserInfo().id resolves to, which for a Parent is
    // the account, not any one child), so looking a token up by studentId
    // directly never matches. Resolve each recipient student to their
    // linked parent account(s) first — a token search that reused
    // `studentIds` here would silently find nothing for every Parent.
    // A "Whole School" notice can hand this thousands of student ids at a
    // large school — batched into several `IN (...)` queries run in
    // parallel instead of one query carrying the whole list (same principle
    // as lib/pushTokens.js's own batching).
    const studentIdBatches = [];
    for (let i = 0; i < studentIds.length; i += 500) studentIdBatches.push(studentIds.slice(i, i + 500));
    const parentLinkBatches = await Promise.all(
      studentIdBatches.map((batch) =>
        prisma.parentStudentLink.findMany({ where: { studentId: { in: batch } }, select: { parentAccountId: true } })
      )
    );
    const parentAccountIds = [...new Set(parentLinkBatches.flat().map((l) => l.parentAccountId))];

    const [teacherTokens, parentTokens] = await Promise.all([
      getPushTokensForOwners('Teacher', teacherIds),
      getPushTokensForOwners('Parent', parentAccountIds),
    ]);
    // Persisted independently of push tokens — a parent/teacher who's never
    // opened the mobile app (or denied notification permission) still sees
    // this in their own bell/notifications list.
    createNotificationsForStudents(schoolId, studentIds, {
      type: 'notice',
      title: notice.title,
      message: notice.message,
      link: '/parent/notices',
      sourceId: notice.id,
    });
    createNotificationsForTeachers(schoolId, teacherIds, {
      type: 'notice',
      title: notice.title,
      message: notice.message,
      link: '/teacher/notices',
      sourceId: notice.id,
    });

    const tokens = [...teacherTokens, ...parentTokens];
    if (!tokens.length) return;

    // Android shows the app's own label (e.g. "schoolapp360") as the bold
    // header above a notification — that's a compile-time app setting, not
    // something a push payload can override. This subtitle is the practical
    // substitute: it renders as a smaller line right under that header, so
    // a teacher signed into one school's account still sees which school a
    // notice is from.
    const schoolLabel = school?.displayName || school?.name;
    const messages = tokens.map((token) => ({
      to: token,
      title: notice.title,
      subtitle: schoolLabel,
      body: notice.message,
      data: { type: 'notice', noticeId: notice.id },
    }));
    await sendExpoPushNotifications(messages);
  } catch (err) {
    console.error('notifyNoticeRecipients failed', err);
  }
}

export async function createNotice(data, currentUser) {
  assertScopeAllowed(data, currentUser);
  const schoolId = await resolveSchoolId();

  const row = await prisma.notice.create({
    data: {
      schoolId,
      ...fieldsFrom(data),
      postedByName: currentUser.name,
      postedByRole: currentUser.role,
      postedByTeacherId: currentUser.role === 'Teacher' ? currentUser.teacherId : null,
    },
  });
  const notice = decorateNotice(row);
  revalidateTag('notices');
  notifyNoticeRecipients(schoolId, notice);
  return notice;
}

export async function updateNotice(id, data, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.notice.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  if (!canManageNotice(currentUser)) {
    throw new Error('Notices are managed by school admins. Teachers have read-only access.');
  }
  assertScopeAllowed(data, currentUser);

  const row = await prisma.notice.update({ where: { id }, data: fieldsFrom(data) });
  if (existing.attachmentUrl && existing.attachmentUrl !== row.attachmentUrl) {
    deleteObject(keyFromPublicUrl(existing.attachmentUrl));
  }
  revalidateTag('notices');
  return decorateNotice(row);
}

export async function deleteNotice(id, currentUser) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.notice.findFirst({ where: { id, schoolId } });
  if (!existing) return false;
  if (!canManageNotice(currentUser)) {
    throw new Error('Notices are managed by school admins. Teachers have read-only access.');
  }
  await prisma.notice.delete({ where: { id } });
  if (existing.attachmentUrl) {
    deleteObject(keyFromPublicUrl(existing.attachmentUrl));
  }
  deleteParentNotificationsBySource(schoolId, id);
  deleteTeacherNotificationsBySource(schoolId, id);
  revalidateTag('notices');
  return true;
}
