import prisma from './db';

function decorateNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

// One row per recipient Teacher — never a single "school-wide" row a client
// has to fan out itself, since read state is per-teacher. Best-effort (never
// throws): called alongside Notice/Exam creation, which must succeed even if
// this fails (same convention as lib/parentNotifications.js's
// createNotificationsForStudents). `sourceId` (e.g. a Notice.id) lets
// deleteNotificationsBySource clean these up if that source row is later
// deleted — omit it for anything with no single deletable source.
export async function createNotificationsForTeachers(schoolId, teacherIds, { type, title, message, link, sourceId }) {
  if (!teacherIds.length) return;
  try {
    await prisma.teacherNotification.createMany({
      data: teacherIds.map((teacherId) => ({
        schoolId,
        teacherId,
        type,
        title,
        message,
        link: link || null,
        sourceId: sourceId || null,
      })),
    });
  } catch (err) {
    console.error('createNotificationsForTeachers failed', err);
  }
}

// Called when the row a notification was generated from is deleted (e.g.
// lib/notices.js's deleteNotice) — otherwise a Teacher keeps seeing a
// notification about something that no longer exists. Best-effort, same
// convention as createNotificationsForTeachers: a cleanup failure must never
// block the source row's own deletion from succeeding.
export async function deleteNotificationsBySource(schoolId, sourceId) {
  try {
    await prisma.teacherNotification.deleteMany({ where: { schoolId, sourceId } });
  } catch (err) {
    console.error('deleteNotificationsBySource failed', err);
  }
}

// Page-based (not cursor-based), same convention as
// lib/parentNotifications.js's getNotificationsForStudent — a teacher's own
// notification count is small enough that offset drift between pages is a
// non-issue in practice. `page` is 1-indexed. Fetches one extra row past
// `limit` to tell the client whether there's a next page without a separate
// COUNT query.
export async function getNotificationsForTeacher(teacherId, schoolId, { limit = 10, page = 1 } = {}) {
  const rows = await prisma.teacherNotification.findMany({
    where: { teacherId, schoolId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit + 1,
  });
  return { notifications: rows.slice(0, limit).map(decorateNotification), hasMore: rows.length > limit };
}

export async function getUnreadNotificationCount(teacherId, schoolId) {
  return prisma.teacherNotification.count({ where: { teacherId, schoolId, isRead: false } });
}

// Total across every page — the "All"/"Read" filter pill counts in the
// mobile app must reflect every row in the DB, not just however many pages
// have been paged in via getNotificationsForTeacher so far.
export async function getTotalNotificationCount(teacherId, schoolId) {
  return prisma.teacherNotification.count({ where: { teacherId, schoolId } });
}

export async function markNotificationRead(id, teacherId, schoolId) {
  const result = await prisma.teacherNotification.updateMany({
    where: { id, teacherId, schoolId },
    data: { isRead: true },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(teacherId, schoolId) {
  const result = await prisma.teacherNotification.updateMany({
    where: { teacherId, schoolId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
