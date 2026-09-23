import { NextResponse } from 'next/server';
import prisma from './db';
import { getSession } from './auth/session';
import { getAdminById } from './admins';
import { getParentAccountById } from './parentAccounts';
import { getTeacherById } from './teachers';
import { getCurrentUser as getDashboardRoleUser } from './currentUser';

// The one place that answers "who is actually signed in right now" across
// every login type — a real DB-backed profile for SuperAdmin/SchoolAdmin
// (resolved from the `edumanage_session` JWT cookie set at login, see
// lib/auth/session.js), with a fallback to lib/currentUser.js's Teacher
// resolution for the one login type that doesn't set that cookie yet. This
// is layered on top of, not a replacement for, lib/currentUser.js — every
// existing Attendance/Students role-scoping call site keeps using that
// directly; this is for "what's this person's actual name/email/school",
// not "which dashboard view should render".
export async function getCurrentUserInfo() {
  const session = await getSession();

  if (session?.role === 'SuperAdmin') {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { id: session.id } });
    if (superAdmin) {
      return { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, role: 'SuperAdmin' };
    }
    // Session cookie outlived the account it points at (deleted directly in
    // the DB, say) — fall through rather than trust a dangling id.
  }

  if (session?.role === 'SchoolAdmin') {
    const admin = await getAdminById(session.id);
    if (admin) {
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'SchoolAdmin',
        schoolId: admin.schoolId,
        schoolName: admin.schoolName,
        status: admin.status,
        permissions: admin.permissions,
        photoUrl: admin.photoUrl,
      };
    }
  }

  if (session?.role === 'Parent') {
    const account = await getParentAccountById(session.id, session.schoolId);
    if (account && account.students.length > 0) {
      // `activeStudentId` is whichever child the parent last switched to
      // (see switchActiveChildAction) — falls back to the first linked
      // child the very first time this account signs in, before any switch
      // has ever happened.
      const activeStudent = account.students.find((s) => s.id === session.activeStudentId) || account.students[0];
      return {
        id: account.id,
        studentId: activeStudent.id,
        name: account.name,
        email: account.email,
        photoUrl: account.photoUrl || null,
        role: 'Parent',
        schoolId: session.schoolId,
        // Every linked child, for the Parent portal's "switch child" UI —
        // never used for scoping (that's always activeStudent.id above).
        students: account.students.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          class: s.class,
          section: s.section,
          admissionId: s.admissionId,
          academicSession: s.academicSession,
          photoUrl: s.photoUrl,
        })),
      };
    }
  }

  if (session?.role === 'Teacher') {
    // Both the web dashboard's Teacher login (app/actions/auth.js's
    // teacherLoginAction) and the mobile client (/api/auth/teacher/login) set
    // a real edumanage_session carrying this teacher's own schoolId — web via
    // the cookie, mobile via the Authorization header.
    const teacher = await getTeacherById(session.id, session.schoolId);
    if (teacher) {
      const assignedClasses = (teacher.assignments || [])
        .filter((a) => a.status === 'Active')
        .map((a) => ({ academicSession: a.academicSession, class: a.class, section: a.section, subject: a.subject || '' }));

      // Every section this teacher is the *Class* Teacher of (Section.
      // classTeacherId), distinct from assignedClasses above (which is
      // "what do I teach", not "whose homeroom am I"). The mobile Exams
      // module's schedule-management screens (Add/Edit/Delete Subject) are
      // gated to exactly this set — mirrors lib/examSchedules.js's
      // assertCanManageSchedule/isClassTeacherFor, just precomputed here so
      // the client can filter its own "My Exams" list without a call per
      // exam.
      const classTeacherSections = await prisma.section.findMany({
        where: { schoolId: session.schoolId, classTeacherId: teacher.id },
        include: {
          class: {
            select: {
              name: true,
              academicSession: true,
              // Exam schedules a Class Teacher creates apply to the whole
              // class (see lib/examSchedules.js addExamSchedule forcing
              // sectionName to '' for Teacher-created rows), not just their
              // own section — so the client needs every sibling section's
              // name too, to label/scope the class picker as "5 (A/B)"
              // instead of implying it's scoped to just "5-A".
              sections: { select: { name: true }, orderBy: { name: 'asc' } },
            },
          },
        },
      });
      const classTeacherOf = classTeacherSections.map((s) => ({
        academicSession: s.class.academicSession,
        class: s.class.name,
        section: s.name,
        allSections: s.class.sections.map((sec) => sec.name),
      }));

      // For the mobile app's dashboard header (school name next to the
      // logo) — nothing else on this branch needed it before.
      const school = await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { displayName: true },
      });

      return {
        id: teacher.id,
        // Alias of `id` — every scoping/ownership check in lib/homework.js
        // (assertScopeAllowed, canManageHomework, fieldsFrom) reads
        // `currentUser.teacherId`, a field only lib/currentUser.js's
        // dashboard-role-toggle shape used to have. Without this alias here,
        // a Teacher's *own* real mobile session resolved to this object
        // would fail every one of those checks (teacherId undefined) —
        // worse, app/api/homework's routes fell back to the toggle actor
        // instead, silently bypassing class-scoping entirely for a real
        // signed-in Teacher.
        teacherId: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.loginEmail,
        photoUrl: teacher.photoUrl || null,
        role: 'Teacher',
        schoolId: session.schoolId,
        schoolName: school?.displayName || null,
        assignedClasses,
        classTeacherOf,
      };
    }
  }

  // No real session cookie/header at all (or one whose account got deleted) —
  // falls back to lib/currentUser.js's in-memory dashboard-role toggle, which
  // still exists for whichever view of /dashboard should render.
  const dashboardUser = await getDashboardRoleUser();
  if (dashboardUser.role === 'Teacher' && dashboardUser.teacherId) {
    return {
      id: dashboardUser.teacherId,
      name: dashboardUser.name,
      role: 'Teacher',
      assignedClasses: dashboardUser.assignedClasses,
    };
  }

  return null;
}

// Returns lib/currentUser.js's shape (role/teacherId/assignedClasses — what
// every existing scoping helper in this app already expects), but with
// `.name` upgraded to the real signed-in identity when one exists. For a
// Teacher, lib/currentUser.js's own name is already the real teacher name
// (resolved from lib/teachers.js) — this only actually changes anything for
// SchoolAdmin, whose lib/currentUser.js name is the generic "Admin"
// placeholder rather than the real logged-in admin's name. Use this (not
// getCurrentUser() directly) anywhere a real person's name gets written onto
// a record — e.g. Notices' postedByName, Homework's assignedByName.
// Auth guard for the Super Admin account-management API routes specifically
// (create/deactivate/reset-password on OTHER super admins) — none of the
// existing super-admin-area routes (schools, school-admins) check the caller
// at all, relying entirely on the page being unreachable otherwise, but that
// gap is wider here: these routes let one super admin lock another out.
// Usage: `const { actor, error } = await requireSuperAdmin(); if (error) return error;`
export async function requireSuperAdmin() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'SuperAdmin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { actor };
}

// Guards the Teachers/Students management API routes — real credentialed
// sessions only (SchoolAdmin, or SuperAdmin who's "managed into" a school
// via setActiveSchoolContext; see app/api/schools/[id]/manage/route.js,
// which never upgrades the real edumanage_session cookie, only the
// lib/currentUser.js dashboard toggle). A signed-in Teacher does carry a real
// session now, but with role 'Teacher' — still rejected here, since Teachers
// aren't allowed to manage other Teachers/Students.
export async function requireSchoolAdmin() {
  const actor = await getCurrentUserInfo();
  if (!actor || (actor.role !== 'SchoolAdmin' && actor.role !== 'SuperAdmin')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { actor };
}

// Unlike requireSuperAdmin (guarding a handful of sensitive super-admin
// routes in an otherwise unguarded app — see SKILL.md), every /parent route
// and API call MUST use this: a parent's session is the only thing standing
// between them and another family's fee/payment data, since the studentId
// it resolves to is never something the caller can supply or override.
export async function requireParent() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { actor };
}

export async function requireTeacher() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Teacher' || !actor.teacherId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { actor };
}

// Split out of getCurrentActor() so a caller that already resolved
// getCurrentUserInfo() itself (the `(await getCurrentUserInfo()) ||
// (await getCurrentActor())` fallback pattern used by a few routes) can
// merge with the dashboard-role toggle without paying for a second,
// identical getCurrentUserInfo() DB round-trip — see app/api/homework and
// app/api/print-marksheet's routes.
export async function mergeWithDashboardActor(sessionUser) {
  const dashboardUser = await getDashboardRoleUser();
  if (sessionUser?.name && dashboardUser.role !== 'Teacher') {
    return { ...dashboardUser, name: sessionUser.name };
  }
  return dashboardUser;
}

export async function getCurrentActor() {
  const [dashboardUser, sessionUser] = await Promise.all([getDashboardRoleUser(), getCurrentUserInfo()]);
  if (sessionUser?.name && dashboardUser.role !== 'Teacher') {
    return { ...dashboardUser, name: sessionUser.name };
  }
  return dashboardUser;
}
