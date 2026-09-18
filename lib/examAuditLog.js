import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';

// Append-only — every call is an insert, never an update, so this can be
// dropped into any exam write path without touching what's already there.
// Best-effort like lib/parentNotifications.js's createNotificationsForStudents:
// a logging hiccup must never fail the actual exam/marks/result action it's
// recording.
export async function logExamAudit(schoolId, examId, action, currentUser, meta = null) {
  try {
    await prisma.examAuditLog.create({
      data: {
        schoolId,
        examId,
        action,
        actorId: currentUser?.id || currentUser?.teacherId || null,
        actorRole: currentUser?.role || '',
        actorName: currentUser?.name || '',
        meta,
      },
    });
  } catch (err) {
    console.error('logExamAudit failed', err);
  }
}

function decorateLog(row) {
  return {
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    actorRole: row.actorRole,
    actorName: row.actorName,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getExamAuditLog(examId) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.examAuditLog.findMany({
    where: { schoolId, examId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(decorateLog);
}
