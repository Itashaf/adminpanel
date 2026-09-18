import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { CATEGORY_COLOR_MAP } from './calendarEventConstants';

// Client-safe constants (CALENDAR_CATEGORIES/CALENDAR_COLORS/...) live in
// lib/calendarEventConstants.js, not here — this file pulls in Prisma +
// resolveSchoolId's next/headers dependency (same split as lib/notices.js),
// so it must never be reachable from a Client Component.

function decorateEvent(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    color: row.color,
    startDate: row.startDate,
    endDate: row.endDate,
    appliesToType: row.appliesToType,
    appliesToClasses: row.appliesToClasses || [],
    appliesToSections: row.appliesToSections || [],
    description: row.description,
    isVisible: row.isVisible,
    academicSession: row.academicSession,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export async function getAllCalendarEvents(schoolId = null) {
  const resolvedSchoolId = schoolId || (await resolveSchoolId());
  const rows = await prisma.calendarEvent.findMany({
    where: { schoolId: resolvedSchoolId },
    orderBy: { startDate: 'asc' },
  });
  return rows.map(decorateEvent);
}

function fieldsFrom(data) {
  return {
    title: data.title,
    category: data.category,
    color: data.color || CATEGORY_COLOR_MAP[data.category] || 'Purple',
    startDate: data.startDate,
    endDate: data.endDate || data.startDate,
    appliesToType: data.appliesToType || 'Whole School',
    appliesToClasses: data.appliesToType === 'Specific Class' ? data.appliesToClasses || [] : [],
    appliesToSections: data.appliesToType === 'Specific Section' ? data.appliesToSections || [] : [],
    description: data.description || '',
    isVisible: data.isVisible ?? true,
    academicSession: data.academicSession || '',
  };
}

export async function createCalendarEvent(data) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.calendarEvent.create({ data: { schoolId, ...fieldsFrom(data) } });
  return decorateEvent(row);
}

export async function updateCalendarEvent(id, data) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.calendarEvent.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  const row = await prisma.calendarEvent.update({ where: { id }, data: fieldsFrom(data) });
  return decorateEvent(row);
}

export async function deleteCalendarEvent(id) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.calendarEvent.findFirst({ where: { id, schoolId } });
  if (!existing) return false;
  await prisma.calendarEvent.delete({ where: { id } });
  return true;
}
