// Matches the fixed id prisma/seed.js gives ABC Public School in the School
// table — this is what every school-scoped data module still living in
// memory (notices, homework, academicSessions, currentUser) checks
// against to decide whether to hand back their seed data or an empty store.
const SEED_SCHOOL_ID = 'school-1';

// Single-tenant demo fallback: a real signed-in session (SchoolAdmin,
// Teacher, Parent) always carries its own real `schoolId` (resolved by
// lib/auth/schoolContext.js's resolveSchoolId()), so this singleton only
// ever matters for (a) a Super Admin session, which isn't scoped to one
// school, and (b) the still-in-memory modules that haven't moved to
// Postgres yet and have no notion of "whose session is this" at all.
// `setActiveSchoolContext` (Super Admin's "Manage This School") only ever
// updates this `id`, not full branding — real branding/settings for a real
// session come from the actual `School` row via lib/schoolSettings.js's
// getSchoolSettings(), not this in-memory copy.
const ACTIVE_SCHOOL = globalThis.__ACTIVE_SCHOOL__ ?? (globalThis.__ACTIVE_SCHOOL__ = { id: SEED_SCHOOL_ID });

// This file must NEVER gain a Prisma or `next/headers` dependency — it's
// reachable from Client Components via lib/students.js/lib/teachers.js
// (which call getActiveSchoolId() for their own school-scoping) importing
// it, and those two are imported by 'use client' form/toolbar components for
// plain constants (SUBJECT_OPTIONS, ...). The real,
// Postgres-backed school-settings functions (getSchoolSettings,
// updateSchoolProfile, etc.) live in the separate lib/schoolSettings.js
// specifically so THEY can safely import Prisma + resolveSchoolId's
// next/headers dependency without breaking that client bundle — don't
// merge the two files back together.
export function getActiveSchoolId() {
  return ACTIVE_SCHOOL.id;
}

// Kept as an explicit alias — lib/schoolScope.js calls this name to make
// clear it intentionally wants the plain singleton (never session-derived),
// not schoolContext.js's resolver.
export function getActiveSchoolIdSync() {
  return ACTIVE_SCHOOL.id;
}

// Lets a super admin "step into" a school from the Schools Directory — only
// updates which school id the not-yet-migrated in-memory modules (and a
// Super Admin session's resolveSchoolId() fallback) point at.
export async function setActiveSchoolContext(entry) {
  ACTIVE_SCHOOL.id = entry.id;
}
