import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { LEAVE_TYPES } from './leaveConstants';
import { createNotificationsForTeachers } from './teacherNotifications';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';

function decorateLeave(row) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    teacherName: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : undefined,
    leaveType: row.leaveType,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason,
    status: row.status,
    reviewedByName: row.reviewedByName,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// A Teacher's own leave history — newest first, same ordering convention as
// getAllHomework/getAllNotices.
export async function getLeavesForTeacher(teacherId, schoolId) {
  const rows = await prisma.teacherLeave.findMany({
    where: { schoolId, teacherId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(decorateLeave);
}

// Every leave request in the school, for the Admin's review queue —
// includes the teacher's name since one Admin list spans every teacher.
export async function getAllLeaveRequests(schoolId, statusFilter = '') {
  const rows = await prisma.teacherLeave.findMany({
    where: { schoolId, ...(statusFilter ? { status: statusFilter } : {}) },
    include: { teacher: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(decorateLeave);
}

export async function applyForLeave(currentUser, data) {
  if (!data.startDate || !data.endDate || !data.reason) {
    throw new Error('Start date, end date and reason are required.');
  }
  if (data.endDate < data.startDate) {
    throw new Error('End date cannot be before the start date.');
  }

  const schoolId = await resolveSchoolId();
  const row = await prisma.teacherLeave.create({
    data: {
      schoolId,
      teacherId: currentUser.teacherId,
      leaveType: LEAVE_TYPES.includes(data.leaveType) ? data.leaveType : 'Casual',
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
    },
  });
  return decorateLeave(row);
}

// Approve/reject — a request already reviewed can't be reviewed again (no
// flip-flopping an Approved leave back to Pending/Rejected through this
// function; deleting and re-applying is the only way to correct a mistake,
// same as this codebase's other one-way status transitions e.g. Payment).
export async function reviewLeaveRequest(id, schoolId, { status, reviewNote, reviewerName }) {
  if (status !== 'Approved' && status !== 'Rejected') {
    throw new Error('Status must be Approved or Rejected.');
  }

  const existing = await prisma.teacherLeave.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  if (existing.status !== 'Pending') {
    throw new Error('This request has already been reviewed.');
  }

  const row = await prisma.teacherLeave.update({
    where: { id },
    data: { status, reviewNote: reviewNote || '', reviewedByName: reviewerName, reviewedAt: new Date() },
  });
  const leave = decorateLeave(row);

  notifyTeacherOfLeaveReview(schoolId, leave).catch((err) => console.error('notifyTeacherOfLeaveReview failed', err));

  return leave;
}

// Fire-and-forget, same convention as lib/homework.js's notifyHomeworkStudents
// — an in-app TeacherNotification (shows in the mobile app's notification
// list regardless of push delivery) plus a real push if the teacher's device
// has a registered Expo token. A notification-persistence hiccup must never
// fail the approve/reject action itself.
async function notifyTeacherOfLeaveReview(schoolId, leave) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { displayName: true, name: true } });
  const title = `Leave request ${leave.status.toLowerCase()}`;
  const message = `Your ${leave.leaveType} leave (${leave.startDate} to ${leave.endDate}) was ${leave.status.toLowerCase()}${
    leave.reviewNote ? `: ${leave.reviewNote}` : '.'
  }`;

  createNotificationsForTeachers(schoolId, [leave.teacherId], {
    type: 'leave',
    title,
    message,
    link: '/dashboard/leave',
    sourceId: leave.id,
  });

  const tokens = await getPushTokensForOwners('Teacher', [leave.teacherId]);
  if (!tokens.length) return;

  const schoolLabel = school?.displayName || school?.name;
  await sendExpoPushNotifications(
    tokens.map((token) => ({
      to: token,
      title,
      subtitle: schoolLabel,
      body: message,
      data: { type: 'leave', leaveId: leave.id },
    }))
  );
}
