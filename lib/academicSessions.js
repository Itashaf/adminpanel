import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getClassesForSession } from './classes';
import { getAllTeachers } from './teachers';
import { suggestSessionName } from './sessionUtils';

// Client-safe suggestSessionName() lives in lib/sessionUtils.js, not here —
// this file pulls in Prisma + resolveSchoolId's next/headers dependency (see
// lib/schoolSettings.js/lib/notices.js for the same split), so it must never
// be reachable from a Client Component. StepAcademicSession.jsx/
// SessionFormModal.jsx import it from lib/sessionUtils.js directly.

export const SESSION_STATUSES = ['Active', 'Upcoming', 'Archived'];

function decorateRow(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

async function getSessionStats(sessionName, schoolId) {
  const [classes, teachers] = await Promise.all([getClassesForSession(sessionName), getAllTeachers(schoolId)]);
  const studentCount = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);
  const sectionCount = classes.reduce((sum, cls) => sum + cls.sectionCount, 0);
  const teacherCount = teachers.filter((teacher) =>
    teacher.assignments?.some((assignment) => assignment.academicSession === sessionName)
  ).length;

  return { studentCount, teacherCount, classCount: classes.length, sectionCount };
}

async function decorateSession(row, schoolId) {
  const session = decorateRow(row);
  const stats = await getSessionStats(session.name, schoolId);
  return { ...session, ...stats };
}

export async function getAllSessions() {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.academicSession.findMany({ where: { schoolId }, orderBy: { startDate: 'asc' } });
  return Promise.all(rows.map((row) => decorateSession(row, schoolId)));
}

export async function getActiveSession() {
  const schoolId = await resolveSchoolId();
  const row = await prisma.academicSession.findFirst({ where: { schoolId, status: 'Active' } });
  return row ? decorateSession(row, schoolId) : null;
}

export async function getSessionById(id) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.academicSession.findFirst({ where: { id, schoolId } });
  if (!row) return null;
  const [decorated, classes] = await Promise.all([decorateSession(row, schoolId), getClassesForSession(row.name)]);
  return { ...decorated, classes };
}

async function assertDatesValid(schoolId, startDate, endDate, excludeId) {
  if (new Date(endDate) <= new Date(startDate)) {
    throw new Error('End date must be after start date.');
  }
  const sessions = await prisma.academicSession.findMany({ where: { schoolId } });
  const overlaps = sessions.some((session) => {
    if (session.id === excludeId) return false;
    return new Date(startDate) <= new Date(session.endDate) && new Date(endDate) >= new Date(session.startDate);
  });
  if (overlaps) {
    throw new Error('This academic session overlaps with an existing session.');
  }
}

export async function addSession(data) {
  const schoolId = await resolveSchoolId();
  const { startDate, endDate, description } = data;
  await assertDatesValid(schoolId, startDate, endDate);

  const name = data.name?.trim() || suggestSessionName(startDate);

  try {
    const row = await prisma.academicSession.create({
      data: { schoolId, name, startDate, endDate, description: description || '', status: 'Upcoming' },
    });
    return decorateRow(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`A session named "${name}" already exists.`);
    }
    throw err;
  }
}

export async function updateSession(id, data) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.academicSession.findFirst({ where: { id, schoolId } });
  if (!existing) return null;

  const { startDate, endDate, description } = data;
  await assertDatesValid(schoolId, startDate, endDate, id);

  const name = data.name?.trim() || suggestSessionName(startDate);

  try {
    const row = await prisma.academicSession.update({
      where: { id },
      data: { name, startDate, endDate, description: description || '' },
    });
    return decorateRow(row);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new Error(`A session named "${name}" already exists.`);
    }
    throw err;
  }
}

// Exactly one Active session per school, enforced here (not a DB
// constraint) — same tradeoff as lib/classes.js's one-class-teacher-per-
// section rule: archive whichever session currently holds it before handing
// the flag to the new one.
export async function setActiveSession(id) {
  const schoolId = await resolveSchoolId();
  const target = await prisma.academicSession.findFirst({ where: { id, schoolId } });
  if (!target) return null;

  await prisma.academicSession.updateMany({ where: { schoolId, status: 'Active' }, data: { status: 'Archived' } });
  const row = await prisma.academicSession.update({ where: { id }, data: { status: 'Active' } });
  return decorateRow(row);
}

export async function archiveSession(id) {
  const schoolId = await resolveSchoolId();
  const target = await prisma.academicSession.findFirst({ where: { id, schoolId } });
  if (!target) return null;
  if (target.status === 'Active') {
    throw new Error('Cannot archive the active session. Set another session as active first.');
  }
  const row = await prisma.academicSession.update({ where: { id }, data: { status: 'Archived' } });
  return decorateRow(row);
}
