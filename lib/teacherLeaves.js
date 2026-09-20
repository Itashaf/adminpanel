import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { LEAVE_TYPES, LEAVE_QUOTAS } from './leaveConstants';
import { createNotificationsForTeachers } from './teacherNotifications';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';

// Inclusive day count — a single-day leave (startDate === endDate) is 1 day,
// not 0.
function dayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - start) / 86400000) + 1;
}

function decorateLeave(row) {
  return {
    id: row.id,
    teacherId: row.teacherId,
    teacherName: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : undefined,
    teacherRole: row.teacher ? row.teacher.specialization || row.teacher.designation : undefined,
    teacherEmployeeId: row.teacher?.employeeId,
    teacherEmail: row.teacher?.email,
    teacherPhone: row.teacher?.phone,
    teacherPhotoUrl: row.teacher?.photoUrl || null,
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
    include: {
      teacher: {
        select: { firstName: true, lastName: true, employeeId: true, email: true, phone: true, designation: true, specialization: true, photoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(decorateLeave);
}

// This year's usage for every leave type, split into already-Approved and
// still-Pending (a Pending request is counted too — otherwise a teacher
// could stack more requests than their quota while waiting on admin review,
// then have all of them approved at once). Keyed by the leave's startDate's
// year, same as applyForLeave's own enforcement below — a leave spanning a
// year boundary is charged to the year it starts in, not split across two.
export async function getLeaveBalance(teacherId, schoolId, year = new Date().getFullYear()) {
  const rows = await prisma.teacherLeave.findMany({
    where: {
      schoolId,
      teacherId,
      status: { in: ['Approved', 'Pending'] },
      startDate: { startsWith: String(year) },
    },
    select: { leaveType: true, startDate: true, endDate: true, status: true },
  });

  return LEAVE_TYPES.map((leaveType) => {
    const quota = LEAVE_QUOTAS[leaveType] ?? null;
    const forType = rows.filter((r) => r.leaveType === leaveType);
    const usedApproved = forType.filter((r) => r.status === 'Approved').reduce((sum, r) => sum + dayCount(r.startDate, r.endDate), 0);
    const usedPending = forType.filter((r) => r.status === 'Pending').reduce((sum, r) => sum + dayCount(r.startDate, r.endDate), 0);
    return {
      leaveType,
      quota,
      usedApproved,
      usedPending,
      remaining: quota === null ? null : Math.max(0, quota - usedApproved - usedPending),
    };
  });
}

export async function applyForLeave(currentUser, data) {
  if (!data.startDate || !data.endDate || !data.reason) {
    throw new Error('Start date, end date and reason are required.');
  }
  if (data.endDate < data.startDate) {
    throw new Error('End date cannot be before the start date.');
  }

  const leaveType = LEAVE_TYPES.includes(data.leaveType) ? data.leaveType : 'Casual';
  const schoolId = await resolveSchoolId();
  const quota = LEAVE_QUOTAS[leaveType] ?? null;

  if (quota !== null) {
    const requestedDays = dayCount(data.startDate, data.endDate);
    const year = new Date(`${data.startDate}T00:00:00`).getFullYear();
    const balance = await getLeaveBalance(currentUser.teacherId, schoolId, year);
    const forType = balance.find((b) => b.leaveType === leaveType);
    if (requestedDays > forType.remaining) {
      throw new Error(
        forType.remaining <= 0
          ? `You have used up your ${leaveType} leave quota for ${year} (${quota} days).`
          : `Only ${forType.remaining} day(s) of ${leaveType} leave remaining for ${year} (requested ${requestedDays}).`
      );
    }
  }

  const row = await prisma.teacherLeave.create({
    data: {
      schoolId,
      teacherId: currentUser.teacherId,
      leaveType,
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
