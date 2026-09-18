import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { assertValidSubjects } from './subjects';

export const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_DAY_START_TIME = '07:00';

// Periods are a single shared, ordered list — every day has the exact same
// period 1..N slots at the exact same times (see TimeTableClient.jsx's
// cascading-duration time computation), matching how a real school actually
// timetables a week (period 3 is always 9:20-10:00, whichever day it is).
// `cells` is then just which subject+teacher (if any) sits in each
// day+period — a period flagged `isBreak` never has a cell at all, so
// clearing/reassigning a day only ever touches `cells[day]`, never
// `periods`.
// A brand new timetable starts pre-filled with a sensible default day shape
// (teaching periods + a lunch break) rather than a completely blank grid —
// the admin adjusts/removes from here instead of building the whole day
// structure from nothing. Nursery/Playway get a shorter 6-period day
// (younger kids, shorter school day) with lunch after the 3rd period; every
// other class gets 8 periods with lunch after the 4th.
const PRE_PRIMARY_CLASSES = ['Nursery', 'Playway'];
const PRE_PRIMARY_PERIOD_COUNT = 6;
const PRE_PRIMARY_LUNCH_AFTER = 3;
const DEFAULT_PERIOD_COUNT = 8;
const DEFAULT_LUNCH_AFTER = 4;

function defaultPeriods(className) {
  const isPrePrimary = PRE_PRIMARY_CLASSES.includes(className);
  const teachingPeriods = isPrePrimary ? PRE_PRIMARY_PERIOD_COUNT : DEFAULT_PERIOD_COUNT;
  const lunchAfter = isPrePrimary ? PRE_PRIMARY_LUNCH_AFTER : DEFAULT_LUNCH_AFTER;

  const periods = [];
  for (let i = 1; i <= lunchAfter; i += 1) periods.push({ id: `p${i}`, duration: 40, isBreak: false });
  periods.push({ id: 'p-lunch', duration: 30, isBreak: true });
  for (let i = lunchAfter + 1; i <= teachingPeriods; i += 1) periods.push({ id: `p${i}`, duration: 40, isBreak: false });
  return periods;
}

function emptySchedule(className) {
  return {
    dayStartTime: DEFAULT_DAY_START_TIME,
    periods: defaultPeriods(className),
    cells: Object.fromEntries(TIMETABLE_DAYS.map((day) => [day, {}])),
  };
}

// A class+section with no TimeTable row yet just gets an empty week back —
// same "nothing saved yet" convention as getMarksSheet/getPrintableRoster,
// rather than a 404, since there's nothing wrong about a class that hasn't
// been scheduled.
export async function getTimeTable(className, sectionName, academicSession) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.timeTable.findUnique({
    where: { schoolId_className_sectionName_academicSession: { schoolId, className, sectionName, academicSession } },
  });
  return { className, sectionName, academicSession, schedule: row?.schedule || emptySchedule(className) };
}

// Every cell that names a real subject (not a break, not empty) must name a
// subject that actually exists in this school's Subjects master list — same
// "connect subject everywhere" rule as Class.subjects/ExamSchedule.subject/
// Homework.subject (see lib/subjects.js's assertValidSubjects).
function validateSchedule(schedule) {
  if (!schedule?.cells || !Array.isArray(schedule.periods) || typeof schedule.dayStartTime !== 'string') {
    throw new Error('Invalid time table.');
  }
  const subjectNames = [];
  for (const day of TIMETABLE_DAYS) {
    const dayCells = schedule.cells[day];
    if (!dayCells || typeof dayCells !== 'object') throw new Error(`Invalid schedule for ${day}.`);
    for (const cell of Object.values(dayCells)) {
      if (cell?.subject) subjectNames.push(cell.subject);
    }
  }
  return subjectNames;
}

// className/sectionName are plain strings here (like every other
// subject-string field, see assertValidSubjects) rather than a real
// Class/Section foreign key — the class/section Dropdowns only ever offer
// real ones, but nothing enforced that server-side, so a stale or made-up
// name could otherwise be saved silently. Mirrors classHasSections'
// blank-name-placeholder-section filtering: a class with zero real sections
// is valid with a blank sectionName (the whole-class convention), a class
// that does have sections must name one of them.
async function assertValidClassSection(schoolId, className, sectionName, academicSession) {
  const cls = await prisma.class.findFirst({ where: { schoolId, academicSession, name: className } });
  if (!cls) throw new Error(`Unknown class: ${className}.`);

  const sections = await prisma.section.findMany({
    where: { schoolId, classId: cls.id, academicSession, name: { not: '' } },
    select: { name: true },
  });
  if (sections.length > 0 && !sections.some((s) => s.name === sectionName)) {
    throw new Error(`Unknown section "${sectionName || '(none)'}" for ${className}.`);
  }
}

export async function saveTimeTable(className, sectionName, academicSession, schedule) {
  const schoolId = await resolveSchoolId();
  await assertValidClassSection(schoolId, className, sectionName, academicSession);
  const subjectNames = validateSchedule(schedule);
  await assertValidSubjects(schoolId, subjectNames);

  const row = await prisma.timeTable.upsert({
    where: { schoolId_className_sectionName_academicSession: { schoolId, className, sectionName, academicSession } },
    update: { schedule },
    create: { schoolId, className, sectionName, academicSession, schedule },
  });
  return { className, sectionName, academicSession, schedule: row.schedule };
}

// For the "View Timetables" picker — which class+sections already have a
// saved time table this session, so the admin can jump straight to one
// instead of guessing which classes are already done. `filled`/`total`
// (non-break slots across the whole week actually assigned a subject) lets
// the picker show each class's completeness at a glance.
export async function listTimeTables(academicSession) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.timeTable.findMany({
    where: { schoolId, academicSession },
    select: { className: true, sectionName: true, schedule: true },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });
  return rows.map((row) => {
    const nonBreakPeriods = (row.schedule?.periods || []).filter((p) => !p.isBreak).length;
    const total = nonBreakPeriods * TIMETABLE_DAYS.length;
    const filled = TIMETABLE_DAYS.reduce((count, day) => {
      const dayCells = row.schedule?.cells?.[day] || {};
      return count + Object.values(dayCells).filter((cell) => cell?.subject).length;
    }, 0);
    return { className: row.className, sectionName: row.sectionName, filled, total };
  });
}

export async function deleteTimeTable(className, sectionName, academicSession) {
  const schoolId = await resolveSchoolId();
  await prisma.timeTable.deleteMany({ where: { schoolId, className, sectionName, academicSession } });
  return true;
}
