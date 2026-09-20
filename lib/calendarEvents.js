import { unstable_cache, revalidateTag } from 'next/cache';
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

// Read-heavy (every teacher/parent's Calendar tab, every focus) against
// data that changes rarely (an admin editing the school calendar). Cached
// for 30s — the same staleness window the mobile client's own RTK Query
// cache already tolerates (baseApi.js's refetchOnMountOrArgChange) — so a
// cache hit here isn't a new correctness concession, just skips a cold DB
// round-trip other requests would've paid for the same data. `schoolId`
// must be resolved OUTSIDE this cached function: Next.js's unstable_cache
// disallows dynamic APIs (cookies/headers, which resolveSchoolId reads)
// inside a cached function's body.
const getCalendarEventsFromDb = unstable_cache(
  async (schoolId) => {
    const rows = await prisma.calendarEvent.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(decorateEvent);
  },
  ['calendar-events'],
  { revalidate: 30, tags: ['calendar-events'] }
);

export async function getAllCalendarEvents(schoolId = null) {
  const resolvedSchoolId = schoolId || (await resolveSchoolId());
  return getCalendarEventsFromDb(resolvedSchoolId);
}

// Same visibility rule as lib/notices.js's getNoticesForStudent: whole-school
// events always show, Specific Class needs the student's class in
// appliesToClasses, Specific Section needs an exact class+section match.
// Only isVisible events reach a Parent, same as the mobile-facing route.
export async function getCalendarEventsForStudent(schoolId, student) {
  const all = await getAllCalendarEvents(schoolId);
  return all.filter((event) => {
    if (!event.isVisible) return false;
    if (event.appliesToType === 'Whole School') return true;
    if (event.appliesToType === 'Specific Class') {
      return (event.appliesToClasses || []).includes(student.class);
    }
    return (event.appliesToSections || []).some(
      (s) => s.class === student.class && s.section === student.section
    );
  });
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
  revalidateTag('calendar-events');
  return decorateEvent(row);
}

export async function updateCalendarEvent(id, data) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.calendarEvent.findFirst({ where: { id, schoolId } });
  if (!existing) return null;
  const row = await prisma.calendarEvent.update({ where: { id }, data: fieldsFrom(data) });
  revalidateTag('calendar-events');
  return decorateEvent(row);
}

export async function deleteCalendarEvent(id) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.calendarEvent.findFirst({ where: { id, schoolId } });
  if (!existing) return false;
  await prisma.calendarEvent.delete({ where: { id } });
  revalidateTag('calendar-events');
  return true;
}
