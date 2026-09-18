import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';

function assertIsAdmin(currentUser) {
  if (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin') {
    throw new Error('Only an admin can manage optional-subject enrollment.');
  }
}

export async function getEnrolledStudentIds(scheduleId) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.examOptionalEnrollment.findMany({ where: { examScheduleId: scheduleId, schoolId }, select: { studentId: true } });
  return rows.map((r) => r.studentId);
}

// Everything the enrollment picker UI needs in one call: the schedule's
// whole class+section roster, plus which of them are already enrolled.
export async function getEligibleStudentsForSchedule(scheduleId) {
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      class: schedule.className,
      ...(schedule.sectionName ? { section: schedule.sectionName } : {}),
    },
    select: { id: true, firstName: true, lastName: true, admissionId: true, section: true },
    orderBy: { firstName: 'asc' },
  });
  const enrolledIds = await getEnrolledStudentIds(scheduleId);

  return {
    students: students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      admissionId: s.admissionId,
      section: s.section,
    })),
    enrolledIds,
  };
}

// Full-replace, same convention as lib/classes.js's Class.subjects update —
// the admin picks the whole enrolled list for one optional schedule at
// once, this just overwrites it rather than diffing add/remove.
export async function setEnrollmentsForSchedule(scheduleId, studentIds, currentUser) {
  assertIsAdmin(currentUser);
  const schoolId = await resolveSchoolId();
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, schoolId } });
  if (!schedule) throw new Error('Exam schedule not found.');
  if (!schedule.isOptional) throw new Error('This subject is not marked optional — every student in the class already takes it.');

  await prisma.$transaction([
    prisma.examOptionalEnrollment.deleteMany({ where: { examScheduleId: scheduleId, schoolId } }),
    prisma.examOptionalEnrollment.createMany({
      data: studentIds.map((studentId) => ({ schoolId, examScheduleId: scheduleId, studentId })),
      skipDuplicates: true,
    }),
  ]);
  return getEnrolledStudentIds(scheduleId);
}
