import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';

// Split out of lib/school.js specifically so this file (and its Prisma +
// next/headers-via-resolveSchoolId dependency chain) is never reachable from
// a Client Component — lib/school.js stays the client-safe sync singleton
// that lib/students.js/lib/teachers.js import; only server-only callers
// (API routes, Server Components) should import from here.

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Reshapes a Prisma School row into the flat shape every existing consumer
// (Sidebar, Topbar, Settings pages) already expects — `updatedAt` stays a
// 'YYYY-MM-DD' string, matching the old in-memory version's format.
function decorateSchool(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    principalName: row.principalName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    country: row.country,
    pinCode: row.pinCode,
    logoUrl: row.logoUrl,
    displayName: row.displayName,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    timezone: row.timezone,
    currency: row.currency,
    dateFormat: row.dateFormat,
    studentIdPrefix: row.studentIdPrefix,
    teacherIdPrefix: row.teacherIdPrefix,
    attendanceDeadlineTime: row.attendanceDeadlineTime,
    attendanceEditGraceMinutes: row.attendanceEditGraceMinutes,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

// A school-less fallback (no real School row for the resolved schoolId —
// e.g. a Super Admin session before ever creating/managing a school, or a
// stale ACTIVE_SCHOOL id left over from a since-deleted school) — every
// existing consumer of this function expects a plain object back, never
// null, so this keeps that contract rather than pushing a null-check onto
// every caller.
function emptySchoolSettings() {
  return {
    id: '',
    name: '',
    code: '',
    principalName: '',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    logoUrl: '',
    displayName: '',
    primaryColor: '',
    secondaryColor: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    studentIdPrefix: 'STD',
    teacherIdPrefix: 'TCH',
    attendanceDeadlineTime: '14:00',
    attendanceEditGraceMinutes: 30,
    updatedAt: today(),
  };
}

// Real per-school settings, scoped by whichever school the current session
// actually belongs to (resolveSchoolId() — a real SchoolAdmin/Teacher/Parent
// session's own schoolId, falling back to lib/school.js's ACTIVE_SCHOOL
// singleton only for a Super Admin session or no session at all). This used
// to always return the same hardcoded in-memory singleton regardless of who
// was signed in — restarting the dev server (or simply being signed in as a
// different school's admin) still showed "ABC Public School" even after
// that school's row had been deleted from Postgres.
export async function getSchoolSettings() {
  const schoolId = await resolveSchoolId();
  const row = await prisma.school.findUnique({ where: { id: schoolId } });
  return row ? decorateSchool(row) : emptySchoolSettings();
}

export async function updateSchoolProfile(data) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.school.update({
    where: { id: schoolId },
    data: {
      name: data.name,
      code: data.code,
      principalName: data.principalName || '',
      email: data.email,
      phone: data.phone,
      website: data.website || '',
    },
  });
  return decorateSchool(row);
}

export async function updateSchoolContact(data) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.school.update({
    where: { id: schoolId },
    data: {
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || '',
      city: data.city,
      state: data.state,
      country: data.country,
      pinCode: data.pinCode,
    },
  });
  return decorateSchool(row);
}

export async function updateSchoolBranding(data) {
  const schoolId = await resolveSchoolId();
  const existing = await prisma.school.findUnique({ where: { id: schoolId } });
  const row = await prisma.school.update({
    where: { id: schoolId },
    data: {
      logoUrl: data.logoUrl ?? existing?.logoUrl ?? '',
      displayName: data.displayName,
      primaryColor: data.primaryColor || '',
      secondaryColor: data.secondaryColor || '',
    },
  });
  return decorateSchool(row);
}

export async function updateSchoolPreferences(data) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.school.update({
    where: { id: schoolId },
    data: {
      timezone: data.timezone,
      currency: data.currency,
      dateFormat: data.dateFormat,
      studentIdPrefix: data.studentIdPrefix.toUpperCase(),
      teacherIdPrefix: data.teacherIdPrefix.toUpperCase(),
    },
  });
  return decorateSchool(row);
}

export async function updateAttendanceSettings(data) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.school.update({
    where: { id: schoolId },
    data: {
      attendanceDeadlineTime: data.attendanceDeadlineTime,
      attendanceEditGraceMinutes: Number(data.attendanceEditGraceMinutes),
    },
  });
  return decorateSchool(row);
}
