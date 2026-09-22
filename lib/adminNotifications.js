import prisma from './db';

function decorate(row) {
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

// School-wide inbox, not per-admin — see the model's own doc comment in
// prisma/schema.prisma for why. Newest first, same convention as every
// other notification list in this app.
export async function getAdminNotifications(schoolId, { limit = 20 } = {}) {
  const rows = await prisma.adminNotification.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(decorate);
}

export async function getUnreadAdminNotificationCount(schoolId) {
  return prisma.adminNotification.count({ where: { schoolId, isRead: false } });
}

// Best-effort, never throws — called alongside whatever real action
// generated it (a new leave request, say), which must succeed even if this
// fails. Same convention as lib/teacherNotifications.js's
// createNotificationsForTeachers.
export async function createAdminNotification(schoolId, { type, title, message, link, sourceId }) {
  try {
    await prisma.adminNotification.create({
      data: { schoolId, type, title, message, link: link || null, sourceId: sourceId || null },
    });
  } catch (err) {
    console.error('createAdminNotification failed', err);
  }
}

export async function markAdminNotificationRead(id, schoolId) {
  const result = await prisma.adminNotification.updateMany({ where: { id, schoolId }, data: { isRead: true } });
  return result.count > 0;
}

export async function markAllAdminNotificationsRead(schoolId) {
  const result = await prisma.adminNotification.updateMany({ where: { schoolId, isRead: false }, data: { isRead: true } });
  return result.count;
}
